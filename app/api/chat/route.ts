import OpenAI from "openai";
import { systemPrompt } from "@/lib/systemPrompt";

// Initialize Fireworks client (OpenAI-compatible)
const fireworks = new OpenAI({
  baseURL: "https://api.fireworks.ai/inference/v1",
  apiKey: process.env.FIREWORKS_API_KEY || "",
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await fireworks.chat.completions.create({
    model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: true,
  });

  // Create a readable stream from the response
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          // Format for Vercel AI SDK data stream protocol
          controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
