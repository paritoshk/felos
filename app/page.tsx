"use client";

import { useEffect, useState } from "react";
import { C1Chat, ThemeProvider } from "@thesysai/genui-sdk";
import { WalletPanel } from "@/components/WalletPanel";
import { AdGenerationForm, AdFormData } from "@/components/AdGenerationForm";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFormSubmit = async (data: AdFormData) => {
    setIsGenerating(true);
    setShowForm(false);
    setGenerationResult(null);

    // Build the prompt based on form data
    let prompt = "";
    if (data.productUrl) {
      prompt = `Create ads for ${data.productUrl}`;
    } else if (data.productName) {
      prompt = `Create ads for a product called "${data.productName}"`;
      if (data.productDescription) {
        prompt += `. Description: ${data.productDescription}`;
      }
    }

    if (data.adTone !== "all") {
      prompt += `. Use a ${data.adTone} tone.`;
    }

    if (data.targetAudience !== "general") {
      prompt += ` Target audience: ${data.targetAudience}.`;
    }

    if (data.generateImages) {
      prompt += " Also generate an ad image.";
    }

    // Send to chat API
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: { role: "user", content: prompt },
          threadId: `session-${Date.now()}`,
        }),
      });

      if (response.ok) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let result = "";

        while (reader) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value);
          setGenerationResult(result);
        }
      }
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationResult("Error generating ads. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Prevent hydration mismatch from ThemeProvider's CSS generation
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
      <div className="h-screen bg-[#030712] flex">
        {/* Left Panel - Form or Results */}
        <div className="w-[420px] border-r border-zinc-800 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-semibold text-white">felos</span>
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">x402</span>
            </div>
            {!showForm && (
              <button
                onClick={() => { setShowForm(true); setGenerationResult(null); }}
                className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
              >
                + New Ad
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {showForm ? (
              <AdGenerationForm onSubmit={handleFormSubmit} isGenerating={isGenerating} />
            ) : (
              <div className="space-y-4">
                {isGenerating && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-500 animate-spin" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-white">Generating Your Ads</h3>
                        <p className="text-xs text-zinc-500">Using x402 micropayments...</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Scraping product data ($0.01)
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        Generating ad copy ($0.02)
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        Creating ad images ($0.04)
                      </div>
                    </div>
                  </div>
                )}

                {generationResult && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-white mb-3">Generated Ads</h3>
                    <div className="prose prose-invert prose-sm max-w-none text-zinc-300 whitespace-pre-wrap">
                      {generationResult}
                    </div>
                  </div>
                )}

                {!isGenerating && generationResult && (
                  <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Ads generated successfully!
                    </div>
                    <p className="text-xs text-green-400/70 mt-1">
                      Check the wallet panel for transaction details
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-mono font-bold text-white">$0.09</div>
                <div className="text-xs text-zinc-500">per ad set</div>
              </div>
              <div>
                <div className="text-lg font-mono font-bold text-green-400">99.95%</div>
                <div className="text-xs text-zinc-500">savings</div>
              </div>
              <div>
                <div className="text-lg font-mono font-bold text-white">2,211</div>
                <div className="text-xs text-zinc-500">ads/$199</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Chat */}
        <div className="flex-1 relative">
          <C1Chat
            formFactor="full-page"
            apiUrl="/api/chat"
            agentName="Felous AI"
          />
        </div>

        {/* Wallet Panel */}
        <WalletPanel />
      </div>
    </ThemeProvider>
  );
}
