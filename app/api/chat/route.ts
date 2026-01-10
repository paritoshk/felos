import { NextRequest } from "next/server";
import OpenAI from "openai";
import { systemPrompt } from "@/lib/systemPrompt";

// Initialize Thesys C1 client (OpenAI-compatible)
const client = new OpenAI({
  baseURL: "https://api.thesys.dev/v1/embed",
  apiKey: process.env.THESYS_API_KEY || "",
});

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  // Add system prompt to messages if not present
  const allMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];

  const response = await client.chat.completions.create({
    model: "c1-nightly",
    messages: allMessages,
    stream: true,
  });

  // Stream the response
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          controller.enqueue(encoder.encode(content));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
