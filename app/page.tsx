"use client";

import { useEffect, useState } from "react";
import { C1Chat, ThemeProvider } from "@thesysai/genui-sdk";
import { WalletWidget } from "@/components/WalletWidget";

export default function Home() {
  const [mounted, setMounted] = useState(false);

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
          <div className="text-xs text-zinc-500">
            AI Ad Generation with Micropayments
          </div>
        </div>

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

        {/* Fixed Wallet Widget */}
        <div className="fixed bottom-4 right-4 z-50">
          <WalletWidget />
        </div>
      </div>
    </ThemeProvider>
  );
}
