"use client";

import { useEffect, useState } from "react";
import { C1Chat, ThemeProvider } from "@thesysai/genui-sdk";
import { WalletWidget } from "@/components/WalletWidget";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-white/50 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider
      mode="dark"
      darkTheme={{
        interactiveAccent: "#3b82f6",
        interactiveAccentHover: "#2563eb",
        backgroundFills: "#030712",
        containerFills: "#111827",
      }}
    >
      <div className="h-screen bg-[#030712] flex flex-col">
        {/* Header */}
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-semibold text-white">felos</span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">x402</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 hidden sm:block">
              AI Ad Generation with Micropayments
            </span>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-white"
              title={sidebarOpen ? "Hide wallet" : "Show wallet"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Area */}
          <div className="flex-1 relative">
            <C1Chat
              formFactor="full-page"
              apiUrl="/api/chat"
              agentName="felos"
              customizeC1={{
                customComponents: {
                  WalletWidget: WalletWidget,
                },
              }}
            />
          </div>

          {/* Collapsible Sidebar */}
          <div
            className={`border-l border-zinc-800 bg-zinc-900/50 transition-all duration-300 ease-in-out overflow-hidden ${
              sidebarOpen ? "w-72" : "w-0"
            }`}
          >
            <div className="w-72 h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-sm font-medium text-white">Wallet</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Wallet Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <WalletWidget />
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-zinc-800">
                <div className="text-center">
                  <div className="text-xs text-zinc-500 mb-1">Powered by</div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs font-medium text-blue-400">Coinbase x402</span>
                    <span className="text-xs text-zinc-600">on</span>
                    <span className="text-xs font-medium text-purple-400">Base</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
