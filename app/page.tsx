"use client";

import { useEffect, useState } from "react";
import { C1Chat, ThemeProvider } from "@thesysai/genui-sdk";
import { WalletWidget } from "@/components/WalletWidget";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

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
      {/* Full-page C1Chat - no interference */}
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

      {/* Floating wallet panel */}
      <div className="fixed bottom-20 right-4 z-50">
        {walletOpen ? (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-72 overflow-hidden">
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-sm font-medium text-white">x402 Wallet</span>
              <button
                onClick={() => setWalletOpen(false)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <WalletWidget />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setWalletOpen(true)}
            className="bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 flex items-center gap-2 hover:bg-zinc-800 transition-colors shadow-xl"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-sm text-zinc-300">Wallet</span>
          </button>
        )}
      </div>
    </ThemeProvider>
  );
}
