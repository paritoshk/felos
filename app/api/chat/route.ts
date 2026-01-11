import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { systemPrompt } from "@/lib/systemPrompt";
import { connectToDatabase, X402_COSTS, SUBSCRIPTION_COSTS } from "@/lib/db";
import { setImage } from "@/lib/imageStore";

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
      // Demo fallback
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

    // Log to MongoDB
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

    return {
      success: true,
      productData,
      cost: X402_COSTS.scrape,
      durationMs,
    };
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
    // Use Fireworks directly for ad copy generation
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
      model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
      messages: [
        {
          role: "system",
          content:
            "Generate 3 ad variations as JSON array. Each with: headline, bodyCopy, cta, tone (urgent/playful/premium). Use the product features and reviews to make compelling ads. Return ONLY valid JSON array, no markdown.",
        },
        {
          role: "user",
          content: productInfo,
        },
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
        {
          headline: `Get ${productName} Now`,
          bodyCopy: "Limited time offer. Don't miss out!",
          cta: "Buy Now",
          tone: "urgent",
        },
        {
          headline: `Love Your ${productName}`,
          bodyCopy: "Join thousands of happy customers.",
          cta: "Try It",
          tone: "playful",
        },
        {
          headline: `Premium ${productName}`,
          bodyCopy: "Experience luxury and quality.",
          cta: "Discover",
          tone: "premium",
        },
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
  const API_KEY = process.env.FIREWORKS_API_KEY;
  
  try {
    // Use SDXL for reliable image generation
    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/stable-diffusion-xl-1024-v1-0",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          prompt: `Professional advertisement: ${prompt}. Clean, modern, high-quality product photography style.`,
          cfg_scale: 7,
          height: 1024,
          width: 1024,
          steps: 30,
        }),
      }
    );

    const durationMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SDXL API error:", errorText);
      return { success: false, error: "Failed to generate image" };
    }

    // SDXL returns raw PNG data, convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const base64DataUrl = `data:image/png;base64,${base64}`;

    // Store image and return short URL (avoids 209k token overflow)
    const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const imageKey = `${sessionId}:${imageId}`;
    setImage(imageKey, base64DataUrl);
    const imageUrl = `/api/image/${imageId}?session=${sessionId}`;

    // Log transaction to MongoDB
    try {
      const db = await connectToDatabase();
      await db.collection("transactions").insertOne({
        sessionId,
        service: "sdxl",
        amount: X402_COSTS.image,
        durationMs,
        timestamp: new Date(),
      });
    } catch (e) {
      console.error("MongoDB error:", e);
    }

    return {
      success: true,
      imageUrl, // Short URL reference (actual image served via /api/image)
      cost: X402_COSTS.image,
      durationMs
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return { success: false, error: String(error) };
  }
}

async function getSpendingReport(sessionId: string) {
  try {
    const db = await connectToDatabase();
    const transactions = await db
      .collection("transactions")
      .find({ sessionId })
      .toArray();

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const byService: Record<string, number> = {};
    transactions.forEach((t) => {
      byService[t.service] = (byService[t.service] || 0) + t.amount;
    });

    const savings = SUBSCRIPTION_COSTS.total - totalSpent;
    const adsForSubPrice = Math.floor(
      SUBSCRIPTION_COSTS.total / X402_COSTS.total
    );

    return {
      totalSpent: `$${totalSpent.toFixed(2)}`,
      byService,
      subscriptionCost: `$${SUBSCRIPTION_COSTS.total}/mo`,
      subscriptionBreakdown: SUBSCRIPTION_COSTS,
      savings: `$${savings.toFixed(2)}`,
      savingsPercent: ((savings / SUBSCRIPTION_COSTS.total) * 100).toFixed(1),
      adsForSubscriptionPrice: adsForSubPrice,
    };
  } catch (e) {
    return {
      totalSpent: "$0.00",
      byService: {},
      subscriptionCost: `$${SUBSCRIPTION_COSTS.total}/mo`,
      savings: `$${SUBSCRIPTION_COSTS.total}`,
      savingsPercent: "100",
      adsForSubscriptionPrice: Math.floor(
        SUBSCRIPTION_COSTS.total / X402_COSTS.total
      ),
    };
  }
}

// Planning tool - creates execution plan before running paid tools
interface PlanStep {
  stepNumber: number;
  action: string;
  tool: string;
  cost: number;
  description: string;
}

interface ExecutionPlan {
  task: string;
  steps: PlanStep[];
  totalCost: number;
  estimatedTimeSeconds: number;
  savingsVsSubscription: string;
}

async function createExecutionPlan(
  task: string,
  steps: PlanStep[],
  totalCost: number,
  estimatedTimeSeconds: number
): Promise<{ success: true; plan: ExecutionPlan }> {
  const savingsPercent = ((199 - totalCost) / 199 * 100).toFixed(1);
  const savingsVsSubscription = `$${(199 - totalCost).toFixed(2)} saved (${savingsPercent}% less than $199/mo subscription)`;

  return {
    success: true,
    plan: {
      task,
      steps,
      totalCost,
      estimatedTimeSeconds,
      savingsVsSubscription,
    },
  };
}

// Tool definitions for OpenAI-compatible API
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "createExecutionPlan",
      description:
        "MUST be called FIRST before any paid tool. Creates an execution plan showing all steps and costs. Call this before scrapeProduct, generateAdCopy, or generateAdImage.",
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "Summary of what will be done for the user",
          },
          steps: {
            type: "array",
            description: "List of steps to execute",
            items: {
              type: "object",
              properties: {
                stepNumber: { type: "number", description: "Step number (1, 2, 3...)" },
                action: { type: "string", description: "What this step does" },
                tool: { type: "string", description: "Tool name to use" },
                cost: { type: "number", description: "Cost in USD (e.g., 0.01, 0.02, 0.06)" },
                description: { type: "string", description: "Brief description of the step" },
              },
              required: ["stepNumber", "action", "tool", "cost", "description"],
            },
          },
          totalCost: {
            type: "number",
            description: "Total cost in USD for all steps",
          },
          estimatedTimeSeconds: {
            type: "number",
            description: "Estimated time to complete in seconds",
          },
        },
        required: ["task", "steps", "totalCost", "estimatedTimeSeconds"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrapeProduct",
      description:
        "Scrape a product URL to extract product info. Costs $0.01 via x402. Use when user provides a URL.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The product page URL to scrape",
          },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateAdCopy",
      description:
        "Generate 3 ad copy variations (urgent, playful, premium). Costs $0.02 via x402.",
      parameters: {
        type: "object",
        properties: {
          productName: { type: "string", description: "Name of the product" },
          productDescription: { type: "string", description: "Description of the product" },
          brand: { type: "string", description: "Brand name (optional)" },
          features: { type: "array", items: { type: "string" }, description: "Product features (optional)" },
          reviews: { type: "string", description: "Review summary (optional)" },
        },
        required: ["productName", "productDescription"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generateAdImage",
      description: "Generate an ad image using SDXL. Costs $0.04 via x402. Returns base64 image data directly in the response.",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "Description of the image to generate",
          },
        },
        required: ["prompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getSpendingReport",
      description:
        "Get x402 spending breakdown and savings vs subscriptions. Use when user asks about spending or savings.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
];

// Execute tool by name
async function executeTool(
  name: string,
  args: Record<string, unknown>,
  sessionId: string
) {
  switch (name) {
    case "createExecutionPlan":
      return await createExecutionPlan(
        args.task as string,
        args.steps as PlanStep[],
        args.totalCost as number,
        args.estimatedTimeSeconds as number
      );
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
  console.log("Received request body:", JSON.stringify(body, null, 2));

  // Handle Thesys SDK format: { prompt: { role, content }, threadId }
  let messages: Array<{ role: string; content: string }> = [];

  if (body.prompt) {
    // Thesys SDK format - single prompt object
    let content = body.prompt.content || "";

    // Extract content from <content thesys="true">...</content> wrapper
    const thesysMatch = content.match(/<content[^>]*>([\s\S]*?)<\/content>/);
    if (thesysMatch) {
      content = thesysMatch[1].trim();
    }

    messages = [{ role: body.prompt.role || "user", content }];
  } else if (body.messages) {
    // Standard OpenAI format
    messages = Array.isArray(body.messages) ? body.messages : [body.messages];
  }

  const threadId = body.threadId || body.thread_id || body.sessionId;
  const sessionId = threadId || "default-session";

  // Create a readable stream for plain text response
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to write to stream
  const writeToStream = async (text: string) => {
    await writer.write(encoder.encode(text));
  };

  // Build messages array with system prompt
  const allMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
  ];

  // Process in background
  (async () => {
    try {
      let currentMessages = [...allMessages];
      let maxRounds = 10; // Prevent infinite loops
      let round = 0;

      while (round < maxRounds) {
        round++;

        const response = await client.chat.completions.create({
          model: "c1/anthropic/claude-sonnet-4/v-20251230",
          messages: currentMessages,
          tools,
          stream: true,
        });

        let toolCalls: {
          id: string;
          name: string;
          arguments: string;
        }[] = [];
        let currentContent = "";
        let hasToolCalls = false;

        // Process the stream
        for await (const chunk of response) {
          const delta = chunk.choices[0]?.delta;

          // Handle content streaming
          if (delta?.content) {
            currentContent += delta.content;
            await writeToStream(delta.content);
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            hasToolCalls = true;
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index;
              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: toolCall.id || "",
                  name: toolCall.function?.name || "",
                  arguments: "",
                };
              }
              if (toolCall.id) toolCalls[index].id = toolCall.id;
              if (toolCall.function?.name)
                toolCalls[index].name = toolCall.function.name;
              if (toolCall.function?.arguments)
                toolCalls[index].arguments += toolCall.function.arguments;
            }
          }

          // Check finish reason
          if (chunk.choices[0]?.finish_reason === "stop") {
            // Model is done, exit loop
            break;
          }
        }

        // If no tool calls, we're done
        if (!hasToolCalls || toolCalls.length === 0) {
          break;
        }

        // Execute tool calls and continue
        // Add assistant message with tool calls
        currentMessages.push({
          role: "assistant",
          content: currentContent || null,
          tool_calls: toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        });

        // Execute each tool and add results
        for (const toolCall of toolCalls) {
          const args = JSON.parse(toolCall.arguments || "{}");
          const result = await executeTool(toolCall.name, args, sessionId);

          currentMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Loop will continue with updated messages
      }

      await writer.close();
    } catch (error) {
      console.error("Chat error:", error);
      await writeToStream("Sorry, I encountered an error. Please try again.");
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
