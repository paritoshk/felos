"use client";

import { useChat } from "ai/react";

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Felous AI</h1>
                <p className="text-xs text-gray-400">x402 Micropayments • Pay per ad, not per month</p>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-green-900/50 text-green-400 rounded text-xs">
                💰 x402 Enabled
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {/* Welcome message if no messages */}
        {messages.length === 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">👋 Welcome to Felous AI!</h2>
            <p className="text-gray-300 mb-4">
              I&apos;m your AI marketing assistant. I create ads using <strong>x402 micropayments</strong> — no subscriptions needed.
            </p>
            <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">What I can do:</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400">
                    <th className="pb-2">Action</th>
                    <th className="pb-2">x402 Cost</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr><td>🔍 Scrape any product URL</td><td className="text-green-400">$0.01</td></tr>
                  <tr><td>✍️ Generate 3 ad variations</td><td className="text-green-400">$0.02</td></tr>
                  <tr><td>🎨 Create ad images (FLUX.1)</td><td className="text-green-400">$0.06</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500">
              Try: &quot;Create ads for https://example.com/product&quot; or &quot;Generate ads for a coffee subscription&quot;
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-3 ${message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-100 border border-gray-700"
                  }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-100 border border-gray-700 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 backdrop-blur-sm border-t border-gray-800 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Paste a product URL or describe what you're selling..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            Send
          </button>
        </form>
        <p className="max-w-4xl mx-auto text-center text-xs text-gray-500 mt-2">
          Felous AI • Powered by x402 micropayments
        </p>
      </div>
    </main>
  );
}
