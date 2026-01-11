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
      {/* Full-page C1Chat */}
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

      {/* Always visible floating wallet panel */}
      <div className="fixed bottom-20 right-4 z-50">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-72 overflow-hidden">
          <div className="p-3 border-b border-zinc-800">
            <span className="text-sm font-medium text-white">x402 Wallet</span>
          </div>
          <div className="p-4">
            <WalletWidget />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
