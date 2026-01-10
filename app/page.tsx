"use client";

import { useState, useCallback } from "react";
import { Thread } from "@crayonai/react-core";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const [threadId] = useState(() => uuidv4());

  const sendMessage = useCallback(
    async (message: string) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: { role: "user", content: message },
          threadId,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");
      return response.body!;
    },
    [threadId]
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AdGen Agent</h1>
                <p className="text-xs text-gray-400">x402 Micropayments • MongoDB • Thesys C1</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs">
                💰 x402 Enabled
              </span>
              <span className="px-2 py-1 bg-purple-900/50 text-purple-400 rounded text-xs">
                🎨 Thesys C1
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="max-w-5xl mx-auto h-[calc(100vh-73px)]">
        <Thread
          onSendMessage={sendMessage}
          welcomeMessage={`# 👋 Welcome to AdGen Agent!

I'm your AI marketing assistant. I create ads using **x402 micropayments** — no subscriptions needed.

## What I can do:
| Action | x402 Cost |
|--------|-----------|
| 🔍 Scrape any product URL | $0.01 |
| ✍️ Generate 3 ad variations | $0.02 |
| 🎨 Create ad images (FLUX.1) | $0.06 |

## Try saying:
- "Create ads for https://example.com/product"
- "Generate ads for a fitness app called FitPro"
- "Show me my spending report"

---

**💡 Fun fact:** These tools cost $199/month as subscriptions. With x402, you pay ~$0.09 per ad — that's **99.95% savings!**`}
          placeholder="Paste a product URL or describe what you're selling..."
          className="h-full"
        />
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/80 backdrop-blur-sm border-t border-gray-800 py-2 text-center text-xs text-gray-500">
        Stop subscribing. Start creating. • Built with Thesys C1 + x402 + MongoDB
      </div>
    </main>
  );
}
