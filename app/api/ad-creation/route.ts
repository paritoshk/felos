import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { logTransaction, X402_COSTS } from "@/lib/db";

// Initialize Fireworks client
const fireworks = new OpenAI({
  apiKey: process.env.FIREWORKS_API_KEY,
  baseURL: "https://api.fireworks.ai/inference/v1",
});

// Platform dimensions
const PLATFORM_DIMENSIONS = {
  "instagram-feed": { width: 1024, height: 1024 },
  "instagram-stories": { width: 768, height: 1344 },
  facebook: { width: 1216, height: 640 },
  general: { width: 1024, height: 1024 },
};

// Style configurations for different ad variations
const STYLE_CONFIGS = {
  "hero-product": "centered hero composition, clean background, studio lighting, product-focused",
  "lifestyle-context": "real-world context, natural lighting, candid feel, people using product",
  "bold-dynamic": "dramatic 45-degree angle, vibrant colors, motion blur, energetic composition",
  "minimal-modern": "extreme negative space, geometric simplicity, clean lines, minimalist design",
  "luxury-premium": "dark moody lighting, rich deep colors, premium textures, sophisticated atmosphere",
};

// Tone modifiers
const TONE_MODIFIERS = {
  urgent: "high energy, bold colors, sense of urgency, action-oriented",
  playful: "bright colors, fun atmosphere, friendly, approachable",
  premium: "elegant, sophisticated, luxury, refined, high-end",
};

// System prompt with execution plan requirement
const SYSTEM_PROMPT = `You are Felous AI, an ad creation assistant that generates professional advertisements using FLUX.1 image generation.

## MANDATORY: Before any action, output an execution plan:

📋 **Execution Plan**
━━━━━━━━━━━━━━━━━━━━━
**Task:** [What you'll do]
**Steps:**
1. 🖼️ Hero Product Shot - $0.06
2. 🖼️ Lifestyle Context - $0.06
3. 🖼️ Bold & Dynamic - $0.06
4. 🖼️ Minimal Modern - $0.06
5. 🖼️ Luxury Premium - $0.06
**Total Cost:** $0.30
━━━━━━━━━━━━━━━━━━━━━

Then call the generateAdImages tool.

## After generation, present results with:
- Each image with its style name
- Suggested headline and CTA for each
- Cost breakdown
- Savings comparison vs agency ($500 for 5 ads)

## Important Rules:
- ALWAYS generate 5 style variations (hero-product, lifestyle-context, bold-dynamic, minimal-modern, luxury-premium)
- ALWAYS show execution plan first
- ALWAYS include cost breakdown
- Be enthusiastic about the creative possibilities!`;

// FLUX image generation function
async function generateFluxImage(params: {
  prompt: string;
  width: number;
  height: number;
  model: "schnell" | "dev";
}): Promise<string | null> {
  const modelPath =
    params.model === "schnell"
      ? "accounts/fireworks/models/flux-1-schnell-fp8"
      : "accounts/fireworks/models/flux-1-dev-fp8";

  try {
    const response = await fetch(
      `https://api.fireworks.ai/inference/v1/image_generation/${modelPath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.FIREWORKS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: params.prompt,
          width: params.width,
          height: params.height,
          steps: params.model === "schnell" ? 4 : 25,
          cfg_scale: params.model === "schnell" ? 7.5 : 3.5,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FLUX API error:", errorText);
      return null;
    }

    const data = await response.json();
    return data.output?.[0]?.url || data.data?.[0]?.url || null;
  } catch (error) {
    console.error("Error generating FLUX image:", error);
    return null;
  }
}

// Build detailed FLUX prompt
function buildPrompt(
  product: { name: string; description: string },
  style: keyof typeof STYLE_CONFIGS,
  tone: keyof typeof TONE_MODIFIERS,
  headline: string,
  cta: string
): string {
  return `Professional advertisement for "${product.name}".

Product: ${product.description}

${STYLE_CONFIGS[style]}

Mood: ${TONE_MODIFIERS[tone]}

Visual requirements:
- High-quality commercial photography, 4K resolution
- Professional composition with space for text overlay
- Headline text area: "${headline}" (top or center, bold typography)
- CTA button area: "${cta}" (bottom, prominent button style)
- Commercial quality, no watermarks, ready for social media

Style: ${style}, tone: ${tone}`;
}

// Generate ad images with multiple styles
async function generateAdImages(params: {
  productName: string;
  productDescription: string;
  tone: "urgent" | "playful" | "premium";
  numberOfVariations?: number;
  threadId: string;
}): Promise<{
  success: boolean;
  images?: Array<{
    imageUrl: string;
    style: string;
    headline: string;
    cta: string;
    description: string;
  }>;
  totalCost?: number;
  error?: string;
}> {
  const { productName, productDescription, tone, numberOfVariations = 5, threadId } = params;
  const startTime = Date.now();

  const product = { name: productName, description: productDescription };
  const styles: Array<keyof typeof STYLE_CONFIGS> = [
    "hero-product",
    "lifestyle-context",
    "bold-dynamic",
    "minimal-modern",
    "luxury-premium",
  ].slice(0, numberOfVariations) as Array<keyof typeof STYLE_CONFIGS>;

  const images = [];
  const dimensions = PLATFORM_DIMENSIONS.general;

  // Generate headlines and CTAs for each style
  const styleHeadlines = {
    "hero-product": `Get ${productName} Now`,
    "lifestyle-context": `Experience ${productName}`,
    "bold-dynamic": `${productName} - Limited Time!`,
    "minimal-modern": `Discover ${productName}`,
    "luxury-premium": `Premium ${productName}`,
  };

  const styleCTAs = {
    urgent: "Buy Now",
    playful: "Try It",
    premium: "Explore",
  };

  for (const style of styles) {
    const headline = styleHeadlines[style] || `Get ${productName}`;
    const cta = styleCTAs[tone] || "Learn More";
    const prompt = buildPrompt(product, style, tone, headline, cta);

    const imageUrl = await generateFluxImage({
      prompt,
      width: dimensions.width,
      height: dimensions.height,
      model: "dev", // Use dev for higher quality
    });

    if (imageUrl) {
      // Log transaction
      await logTransaction("FLUX.1 dev", X402_COSTS.fluxDev, threadId, {
        durationMs: Date.now() - startTime,
        productName,
        style,
        headline,
        cta,
      });
    }

    images.push({
      imageUrl: imageUrl || "https://placehold.co/1024x1024/1a1a2e/white?text=Ad+Image",
      style: style.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      headline,
      cta,
      description: STYLE_CONFIGS[style],
    });
  }

  const totalCost = X402_COSTS.fluxDev * images.length;

  return {
    success: true,
    images,
    totalCost,
  };
}

// Tool definitions for LLM
const tools = [
  {
    type: "function" as const,
    function: {
      name: "generateAdImages",
      description:
        "Generate ad images using FLUX.1. Costs $0.06 per image. Always generate 5 variations with different styles: hero-product, lifestyle-context, bold-dynamic, minimal-modern, luxury-premium.",
      parameters: {
        type: "object",
        properties: {
          productName: { type: "string", description: "Name of the product" },
          productDescription: {
            type: "string",
            description: "Description of the product",
          },
          tone: {
            type: "string",
            enum: ["urgent", "playful", "premium"],
            description: "Tone of the advertisement",
          },
          numberOfVariations: {
            type: "number",
            minimum: 1,
            maximum: 5,
            description: "Number of image variations to generate (default: 5)",
          },
        },
        required: ["productName", "productDescription", "tone"],
      },
    },
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Handle Thesys SDK format: { prompt: { role, content }, threadId }
    let messages: Array<{ role: string; content: string }> = [];
    let userContent = "";

    if (body.prompt) {
      // Thesys SDK format - single prompt object
      userContent = body.prompt.content || "";
      
      // Extract content from <content thesys="true">...</content> wrapper
      const thesysMatch = userContent.match(/<content[^>]*>([\s\S]*?)<\/content>/);
      if (thesysMatch) {
        userContent = thesysMatch[1].trim();
      }
      
      messages = [{ role: body.prompt.role || "user", content: userContent }];
    } else if (body.messages) {
      // Standard OpenAI format
      messages = Array.isArray(body.messages) ? body.messages : [body.messages];
      userContent = messages[0]?.content || "";
    }

    const threadId = body.threadId || body.thread_id || body.sessionId || `session-${Date.now()}`;

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Helper to write to stream
    const writeToStream = async (text: string) => {
      await writer.write(encoder.encode(text));
    };

    // Process in background
    (async () => {
      try {
        // First, show execution plan
        const executionPlan = `📋 **Execution Plan**
━━━━━━━━━━━━━━━━━━━━━
**Task:** Generate 5 professional ad variations using FLUX.1
**Steps:**
1. 🖼️ Hero Product Shot - $0.06
2. 🖼️ Lifestyle Context - $0.06
3. 🖼️ Bold & Dynamic - $0.06
4. 🖼️ Minimal Modern - $0.06
5. 🖼️ Luxury Premium - $0.06
**Total Cost:** $0.30
━━━━━━━━━━━━━━━━━━━━━

Generating images now...\n\n`;

        await writeToStream(executionPlan);

        // Extract product info from user message
        // Try to parse product name and description from user input
        let productName = "Product";
        let productDescription = "High-quality product";
        let tone: "urgent" | "playful" | "premium" = "premium";

        // Simple parsing - look for common patterns
        if (userContent.toLowerCase().includes("coffee") || userContent.toLowerCase().includes("beanbox")) {
          productName = "BeanBox Coffee Subscription";
          productDescription = "Premium coffee subscription service with curated beans from around the world";
        } else if (userContent.toLowerCase().includes("urgent")) {
          tone = "urgent";
        } else if (userContent.toLowerCase().includes("playful") || userContent.toLowerCase().includes("fun")) {
          tone = "playful";
        } else if (userContent.toLowerCase().includes("premium") || userContent.toLowerCase().includes("luxury")) {
          tone = "premium";
        }

        // Try to extract product name from quotes or after "for"
        const forMatch = userContent.match(/for\s+([^.!?]+)/i);
        if (forMatch) {
          productName = forMatch[1].trim();
        }

        // Call Fireworks LLM to extract product info if needed
        const llmResponse = await fireworks.chat.completions.create({
          model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
          messages: [
            {
              role: "system",
              content: "Extract product name and description from user message. Return JSON: {productName, productDescription, tone: 'urgent'|'playful'|'premium'}",
            },
            { role: "user", content: userContent },
          ],
          temperature: 0.3,
          max_tokens: 200,
        });

        try {
          const llmContent = llmResponse.choices[0]?.message?.content || "";
          const jsonMatch = llmContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.productName) productName = parsed.productName;
            if (parsed.productDescription) productDescription = parsed.productDescription;
            if (parsed.tone) tone = parsed.tone;
          }
        } catch (e) {
          // Use defaults if parsing fails
        }

        // Generate images
        const result = await generateAdImages({
          productName,
          productDescription,
          tone,
          numberOfVariations: 5,
          threadId,
        });

        if (result.success && result.images) {
          await writeToStream(`\n## 🎨 Generated Ad Images\n\n`);
          await writeToStream(`I've generated ${result.images.length} unique ad variations:\n\n`);

          for (let i = 0; i < result.images.length; i++) {
            const img = result.images[i];
            await writeToStream(`### Option ${i + 1}: ${img.style}\n`);
            await writeToStream(`- **Image:** ![${img.style}](${img.imageUrl})\n`);
            await writeToStream(`- **Headline:** ${img.headline}\n`);
            await writeToStream(`- **CTA:** ${img.cta}\n`);
            await writeToStream(`- **Style:** ${img.description}\n\n`);
          }

          const savings = ((500 - (result.totalCost || 0)) / 500) * 100;
          await writeToStream(
            `\n**💰 Total Cost: $${(result.totalCost || 0).toFixed(2)}** (vs $500 agency fee = ${savings.toFixed(1)}% savings!)\n`
          );
        } else {
          await writeToStream(`\n❌ Error generating images: ${result.error || "Unknown error"}\n`);
        }
      } catch (error) {
        console.error("Error in ad creation:", error);
        await writeToStream(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}\n`);
      } finally {
        writer.close();
      }
    })();

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Ad creation API error:", error);
    return NextResponse.json(
      {
        error: "Ad creation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
