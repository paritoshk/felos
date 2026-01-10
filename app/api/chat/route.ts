import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { transformStream } from "@crayonai/stream";
import { systemPrompt } from "@/lib/systemPrompt";
import { tools } from "@/lib/tools";

// In-memory message store (use Redis/MongoDB in production)
const messageStores: Record<string, ChatCompletionMessageParam[]> = {};

function getMessageStore(threadId: string) {
  if (!messageStores[threadId]) {
    messageStores[threadId] = [{ role: "system", content: systemPrompt }];
  }
  return {
    messages: messageStores[threadId],
    addMessage: (msg: ChatCompletionMessageParam) => {
      messageStores[threadId].push(msg);
    },
  };
}

export async function POST(req: NextRequest) {
  const { prompt, threadId } = (await req.json()) as {
    prompt: { role: string; content: string };
    threadId: string;
  };

  // Initialize Thesys C1 client (OpenAI-compatible)
  const client = new OpenAI({
    baseURL: "https://api.thesys.dev/v1/embed",
    apiKey: process.env.THESYS_API_KEY!,
  });

  const store = getMessageStore(threadId);
  store.addMessage(prompt as ChatCompletionMessageParam);

  // Create tools with sessionId bound
  const boundTools = tools.map((tool) => ({
    type: tool.type,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
      parse: tool.function.parse,
      function: (args: any) => tool.function.function(args, threadId),
    },
  }));

  try {
    // Use runTools for automatic tool calling
    const runner = client.beta.chat.completions.runTools({
      model: "c1-nightly",
      messages: store.messages,
      tools: boundTools as any,
      stream: true,
    });

    // Track messages from tool calls
    runner.on("message", (message) => {
      store.addMessage(message as ChatCompletionMessageParam);
    });

    const stream = await runner;

    // Transform to C1 format
    const responseStream = transformStream(
      stream,
      (chunk) => chunk.choices[0]?.delta?.content || "",
      {
        onEnd: ({ accumulated }) => {
          const content = accumulated.filter(Boolean).join("");
          if (content) {
            store.addMessage({ role: "assistant", content });
          }
        },
      }
    ) as ReadableStream<string>;

    return new NextResponse(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
