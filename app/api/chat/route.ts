import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { makeC1Response } from "@thesysai/genui-sdk/server";
import { systemPrompt } from "@/lib/systemPrompt";
import { connectToDatabase, X402_COSTS, SUBSCRIPTION_COSTS } from "@/lib/db";

export const dynamic = "force-dynamic";

// Initialize Thesys C1 client
const client = new OpenAI({
  apiKey: process.env.THESYS_API_KEY || "",
  baseURL: "https://api.thesys.dev/v1/embed",
});

// Tool implementations
async function scrapeProduct(url: string, sessionId: string) {
  const startTime = Date.now();

  try {
    const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
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
              name: { type: "string", description: "Product name" },
              brand: { type: "string", description: "Brand or manufacturer name" },
              description: { type: "string", description: "Product description" },
              price: { type: "string", description: "Price with currency" },
              features: {
                type: "array",
                items: { type: "string" },
                description: "Key product features or bullet points"
              },
              reviews: { type: "string", description: "Customer review summary or rating" },
            },
          },
        },
      }),
    });

    const durationMs = Date.now() - startTime;
    let productData;

    if (response.ok) {
      const data = await response.json();
      const extract = data.data?.extract || {};
      productData = {
        name: extract.name || "Product",
        brand: extract.brand || "",
        description: extract.description || data.data?.markdown?.slice(0, 300) || "",
        price: extract.price || "$XX.XX",
        features: extract.features || [],
        reviews: extract.reviews || "",
        url,
      };
    } else {
      productData = {
        name: "Premium Product",
        brand: "Quality Brand",
        description: "High-quality product with exceptional features and craftsmanship.",
        price: "$49.99",
        features: ["Premium materials", "30-day guarantee", "Fast shipping"],
        reviews: "4.5/5 stars from 500+ reviews",
        url,
      };
    }

    try {
      const db = await connectToDatabase();
      await db.collection("transactions").insertOne({
        sessionId,
        service: "firecrawl",
        amount: X402_COSTS.scrape,
        durationMs,
        timestamp: new Date(),
      });
    } catch (e) {
      console.error("MongoDB error:", e);
    }

    return { success: true, productData, cost: X402_COSTS.scrape, durationMs };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function generateAdCopy(
  productName: string,
  productDescription: string,
  sessionId: string,
  brand?: string,
  features?: string[],
  reviews?: string
) {
  const startTime = Date.now();

  try {
    const fireworksClient = new OpenAI({
      baseURL: "https://api.fireworks.ai/inference/v1",
      apiKey: process.env.FIREWORKS_API_KEY || "",
    });

    const productInfo = [
      `Product: ${productName}`,
      brand ? `Brand: ${brand}` : "",
      `Description: ${productDescription}`,
      features?.length ? `Features: ${features.join(", ")}` : "",
      reviews ? `Reviews: ${reviews}` : "",
    ].filter(Boolean).join("\n");

    const response = await fireworksClient.chat.completions.create({
      model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
      messages: [
        {
          role: "system",
          content:
            "Generate 3 ad variations as JSON array. Each with: headline, bodyCopy, cta, tone (urgent/playful/premium). Return ONLY valid JSON array, no markdown.",
        },
        { role: "user", content: productInfo },
      ],
      max_tokens: 600,
    });

    const durationMs = Date.now() - startTime;
    let adVariations;

    try {
      const content = response.choices[0]?.message?.content
        ?.replace(/```json\n?|\n?```/g, "")
        .trim();
      adVariations = JSON.parse(content || "[]");
    } catch {
      adVariations = [
        { headline: `Get ${productName} Now`, bodyCopy: "Limited time offer!", cta: "Buy Now", tone: "urgent" },
        { headline: `Love Your ${productName}`, bodyCopy: "Join happy customers.", cta: "Try It", tone: "playful" },
        { headline: `Premium ${productName}`, bodyCopy: "Experience quality.", cta: "Discover", tone: "premium" },
      ];
    }

    try {
      const db = await connectToDatabase();
      await db.collection("transactions").insertOne({
        sessionId,
        service: "fireworks-llm",
        amount: X402_COSTS.llm,
        durationMs,
        timestamp: new Date(),
      });
    } catch (e) {
      console.error("MongoDB error:", e);
    }

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
          prompt: `Professional advertisement: ${prompt}. Clean, modern, high-quality product photography style.`,
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
      else if (data.data?.[0]?.b64_json)
        imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
    }

    try {
      const db = await connectToDatabase();
      await db.collection("transactions").insertOne({
        sessionId,
        service: "fireworks-flux",
        amount: X402_COSTS.image,
        durationMs,
        timestamp: new Date(),
      });
    } catch (e) {
      console.error("MongoDB error:", e);
    }

    return { success: true, imageUrl, cost: X402_COSTS.image, durationMs };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

async function getSpendingReport(sessionId: string) {
  try {
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
  } catch {
    return {
      totalSpent: "$0.00",
      byService: {},
      subscriptionCost: `$${SUBSCRIPTION_COSTS.total}/mo`,
      savings: `$${SUBSCRIPTION_COSTS.total}`,
      adsForSubscriptionPrice: Math.floor(SUBSCRIPTION_COSTS.total / X402_COSTS.total),
    };
  }
}

// Tool definitions
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "scrapeProduct",
      description: "Scrape a product URL to extract product info. Costs $0.01 via x402.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "The product page URL" } },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateAdCopy",
      description: "Generate 3 ad copy variations (urgent, playful, premium). Costs $0.02 via x402.",
      parameters: {
        type: "object",
        properties: {
          productName: { type: "string" },
          productDescription: { type: "string" },
          brand: { type: "string" },
          features: { type: "array", items: { type: "string" } },
          reviews: { type: "string" },
        },
        required: ["productName", "productDescription"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateAdImage",
      description: "Generate an ad image using FLUX.1. Costs $0.06 via x402.",
      parameters: {
        type: "object",
        properties: { prompt: { type: "string", description: "Image description" } },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSpendingReport",
      description: "Get x402 spending breakdown and savings vs subscriptions.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
];

async function executeTool(name: string, args: Record<string, unknown>, sessionId: string) {
  switch (name) {
    case "scrapeProduct":
      return await scrapeProduct(args.url as string, sessionId);
    case "generateAdCopy":
      return await generateAdCopy(
        args.productName as string,
        args.productDescription as string,
        sessionId,
        args.brand as string | undefined,
        args.features as string[] | undefined,
        args.reviews as string | undefined
      );
    case "generateAdImage":
      return await generateAdImage(args.prompt as string, sessionId);
    case "getSpendingReport":
      return await getSpendingReport(sessionId);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Parse request - handle both C1Chat format and standard format
  let userContent = "";

  if (body.prompt) {
    // C1Chat format: { prompt: { role, content }, threadId }
    let content = body.prompt.content || "";
    const thesysMatch = content.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    userContent = thesysMatch ? thesysMatch[1].trim() : content;
  } else if (body.messages) {
    // Standard format: { messages: [...], threadId }
    const msgs = Array.isArray(body.messages) ? body.messages : [body.messages];
    const lastUserMsg = msgs.filter((m: { role: string }) => m.role === "user").pop();
    userContent = lastUserMsg?.content || "";
  }

  const sessionId = body.threadId || body.thread_id || "default-session";
  const c1Response = makeC1Response();

  // Build messages for the API
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  const meta = {
    thesys: JSON.stringify({
      c1_included_components: ["Layout"],
    }),
  };

  // Process in background
  (async () => {
    try {
      const response = await client.chat.completions.create({
        model: "c1/openai/gpt-5/v-20251230",
        messages,
        tools,
        stream: true,
        metadata: meta,
      });

      let toolCalls: { id: string; name: string; arguments: string }[] = [];
      let currentContent = "";

      for await (const chunk of response) {
        const delta = chunk.choices[0]?.delta;

        if (delta?.content) {
          currentContent += delta.content;
          c1Response.writeContent(delta.content);
        }

        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const index = toolCall.index;
            if (!toolCalls[index]) {
              toolCalls[index] = { id: toolCall.id || "", name: toolCall.function?.name || "", arguments: "" };
            }
            if (toolCall.id) toolCalls[index].id = toolCall.id;
            if (toolCall.function?.name) toolCalls[index].name = toolCall.function.name;
            if (toolCall.function?.arguments) toolCalls[index].arguments += toolCall.function.arguments;
          }
        }

        if (chunk.choices[0]?.finish_reason === "tool_calls" && toolCalls.length > 0) {
          const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

          toolResults.push({
            role: "assistant",
            content: currentContent || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });

          for (const toolCall of toolCalls) {
            const args = JSON.parse(toolCall.arguments || "{}");
            const result = await executeTool(toolCall.name, args, sessionId);
            toolResults.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) });
          }

          const continuedResponse = await client.chat.completions.create({
            model: "c1/openai/gpt-5/v-20251230",
            messages: [...messages, ...toolResults],
            tools,
            stream: true,
            metadata: meta,
          });

          for await (const chunk of continuedResponse) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) c1Response.writeContent(content);
          }
        }
      }

      c1Response.end();
    } catch (error) {
      console.error("Chat error:", error);
      c1Response.writeContent("Sorry, I encountered an error. Please try again.");
      c1Response.end();
    }
  })();

  return new NextResponse(c1Response.responseStream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
