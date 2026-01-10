import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { connectToDatabase, X402_COSTS, SUBSCRIPTION_COSTS } from "@/lib/db";

// Tool implementations
async function scrapeProduct(url: string, sessionId: string) {
  const startTime = Date.now();
  
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "extract"],
        extract: {
          schema: {
            type: "object",
            properties: {
              name: { type: "string" },
              description: { type: "string" },
              price: { type: "string" },
            },
          },
        },
      }),
    });

    const durationMs = Date.now() - startTime;
    let productData;

    if (response.ok) {
      const data = await response.json();
      productData = {
        name: data.data?.extract?.name || "Product",
        description: data.data?.extract?.description || data.data?.markdown?.slice(0, 300) || "",
        price: data.data?.extract?.price || "$XX.XX",
        url,
      };
    } else {
      // Demo fallback
      productData = {
        name: "Premium Product",
        description: "High-quality product with exceptional features and craftsmanship.",
        price: "$49.99",
        url,
      };
    }

    // Log to MongoDB
    const db = await connectToDatabase();
    await db.collection("transactions").insertOne({
      sessionId,
      service: "firecrawl",
      amount: X402_COSTS.scrape,
      durationMs,
      timestamp: new Date(),
    });

    return { success: true, productData, cost: X402_COSTS.scrape, durationMs };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function generateAdCopy(productName: string, productDescription: string, sessionId: string) {
  const startTime = Date.now();

  try {
    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
        messages: [
          {
            role: "system",
            content: "Generate 3 ad variations as JSON array. Each with: headline, bodyCopy, cta, tone (urgent/playful/premium). Return ONLY valid JSON.",
          },
          {
            role: "user",
            content: `Product: ${productName}\nDescription: ${productDescription}`,
          },
        ],
        max_tokens: 600,
      }),
    });

    const durationMs = Date.now() - startTime;
    let adVariations;

    if (response.ok) {
      const data = await response.json();
      try {
        const content = data.choices[0]?.message?.content?.replace(/```json\n?|\n?```/g, "").trim();
        adVariations = JSON.parse(content);
      } catch {
        adVariations = getDefaultAds(productName);
      }
    } else {
      adVariations = getDefaultAds(productName);
    }

    const db = await connectToDatabase();
    await db.collection("transactions").insertOne({
      sessionId,
      service: "fireworks-llm",
      amount: X402_COSTS.llm,
      durationMs,
      timestamp: new Date(),
    });

    return { success: true, adVariations, cost: X402_COSTS.llm, durationMs };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function generateAdImage(prompt: string, sessionId: string) {
  const startTime = Date.now();

  try {
    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/flux-1-schnell-fp8",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: `Professional advertisement: ${prompt}. Clean, modern, high-quality.`,
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 4,
        }),
      }
    );

    const durationMs = Date.now() - startTime;
    let imageUrl = "https://placehold.co/512x512/1a1a2e/white?text=Ad+Image";

    if (response.ok) {
      const data = await response.json();
      if (data.data?.[0]?.url) imageUrl = data.data[0].url;
      else if (data.data?.[0]?.b64_json) imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
    }

    const db = await connectToDatabase();
    await db.collection("transactions").insertOne({
      sessionId,
      service: "fireworks-flux",
      amount: X402_COSTS.image,
      durationMs,
      timestamp: new Date(),
    });

    return { success: true, imageUrl, cost: X402_COSTS.image, durationMs };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function getSpendingReport(sessionId: string) {
  const db = await connectToDatabase();
  const transactions = await db.collection("transactions").find({ sessionId }).toArray();

  const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
  const byService: Record<string, number> = {};
  transactions.forEach((t) => {
    byService[t.service] = (byService[t.service] || 0) + t.amount;
  });

  const savings = SUBSCRIPTION_COSTS.total - totalSpent;
  const adsForSubPrice = Math.floor(SUBSCRIPTION_COSTS.total / X402_COSTS.total);

  return {
    totalSpent: `$${totalSpent.toFixed(2)}`,
    byService,
    subscriptionCost: `$${SUBSCRIPTION_COSTS.total}/mo`,
    savings: `$${savings.toFixed(2)}`,
    savingsPercent: ((savings / SUBSCRIPTION_COSTS.total) * 100).toFixed(1),
    adsForSubscriptionPrice: adsForSubPrice,
  };
}

function getDefaultAds(productName: string) {
  return [
    { headline: `Get ${productName} Now`, bodyCopy: "Limited time offer. Don't miss out!", cta: "Buy Now", tone: "urgent" },
    { headline: `Love Your ${productName}`, bodyCopy: "Join thousands of happy customers.", cta: "Try It", tone: "playful" },
    { headline: `Premium ${productName}`, bodyCopy: "Experience luxury and quality.", cta: "Discover", tone: "premium" },
  ];
}

// Export tools for OpenAI-compatible API
export const tools = [
  {
    type: "function" as const,
    function: {
      name: "scrapeProduct",
      description: "Scrape a product URL to extract product info. Costs $0.01 via x402. Use this when user provides a URL.",
      parameters: zodToJsonSchema(
        z.object({
          url: z.string().url().describe("The product page URL to scrape"),
        })
      ),
      parse: JSON.parse,
      function: async ({ url }: { url: string }, sessionId: string) => {
        return JSON.stringify(await scrapeProduct(url, sessionId));
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generateAdCopy",
      description: "Generate 3 ad copy variations (urgent, playful, premium). Costs $0.02 via x402.",
      parameters: zodToJsonSchema(
        z.object({
          productName: z.string().describe("Name of the product"),
          productDescription: z.string().describe("Description of the product"),
        })
      ),
      parse: JSON.parse,
      function: async ({ productName, productDescription }: { productName: string; productDescription: string }, sessionId: string) => {
        return JSON.stringify(await generateAdCopy(productName, productDescription, sessionId));
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "generateAdImage",
      description: "Generate an ad image using FLUX.1. Costs $0.06 via x402.",
      parameters: zodToJsonSchema(
        z.object({
          prompt: z.string().describe("Description of the image to generate"),
        })
      ),
      parse: JSON.parse,
      function: async ({ prompt }: { prompt: string }, sessionId: string) => {
        return JSON.stringify(await generateAdImage(prompt, sessionId));
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getSpendingReport",
      description: "Get x402 spending breakdown and savings vs subscriptions. Show this as a nice visual summary.",
      parameters: zodToJsonSchema(z.object({})),
      parse: JSON.parse,
      function: async (_: object, sessionId: string) => {
        return JSON.stringify(await getSpendingReport(sessionId));
      },
    },
  },
];
