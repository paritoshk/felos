"use client";

import { useState, useEffect } from "react";

interface Transaction {
    id: string;
    type: "incoming" | "outgoing";
    service: string;
    amount: number;
    timestamp: string;
}

interface WalletData {
    wallet: {
        address: string;
        network: string;
        chainId: string;
        explorerUrl: string;
    };
    balance: {
        usdc: string;
        eth: string;
    };
    x402: {
        enabled: boolean;
    };
    stats: {
        totalReceived: string;
        totalSpent: string;
        netFlow: string;
    };
    recentTransactions: Transaction[];
}

export function WalletPanel() {
    const [walletData, setWalletData] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [fundingStatus, setFundingStatus] = useState<"idle" | "funding" | "success" | "error">("idle");

    // Fetch wallet status
    const fetchWallet = async () => {
        try {
            const res = await fetch("/api/wallet");
            const data = await res.json();
            setWalletData(data);
        } catch (err) {
            console.error("Failed to fetch wallet:", err);
        }
    };

    useEffect(() => {
        fetchWallet();
        // Poll every 10 seconds for updates
        const interval = setInterval(fetchWallet, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleFundWallet = async () => {
        setLoading(true);
        setFundingStatus("funding");
        try {
            const res = await fetch("/api/wallet", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setFundingStatus("success");
                // Refresh wallet after delay
                setTimeout(fetchWallet, 5000);
                setTimeout(() => setFundingStatus("idle"), 8000);
            } else {
                setFundingStatus("error");
                setTimeout(() => setFundingStatus("idle"), 3000);
            }
        } catch {
            setFundingStatus("error");
            setTimeout(() => setFundingStatus("idle"), 3000);
        } finally {
            setLoading(false);
        }
    };

    const formatService = (service: string) => {
        const names: Record<string, string> = {
            "firecrawl": "Scrape",
            "fireworks-llm": "LLM",
            "sdxl": "Image",
            "FLUX Kontext Pro": "Image",
        };
        return names[service] || service;
    };

    const balance = parseFloat(walletData?.balance?.usdc || "0");

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {/* Collapsed View */}
            {!expanded ? (
                <button
                    onClick={() => setExpanded(true)}
                    className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 flex items-center gap-3 hover:bg-zinc-800 transition-colors shadow-xl"
                >
                    <div className={`w-2 h-2 rounded-full ${walletData?.wallet?.address ? "bg-green-500" : "bg-zinc-500"}`} />
                    <span className="text-sm text-zinc-300">x402 Wallet</span>
                    <span className="font-mono text-white font-semibold">${balance.toFixed(2)}</span>
                </button>
            ) : (
                /* Expanded View */
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-80 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${walletData?.x402?.enabled ? "bg-green-500" : "bg-yellow-500"}`} />
                            <span className="font-semibold text-white">x402 Wallet</span>
                        </div>
                        <button
                            onClick={() => setExpanded(false)}
                            className="text-zinc-500 hover:text-white transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Balance */}
                    <div className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30">
                        <div className="text-xs text-zinc-400 mb-1">Available Balance</div>
                        <div className="flex items-end gap-2">
                            <span className="text-3xl font-mono font-bold text-white">${balance.toFixed(2)}</span>
                            <span className="text-xs text-zinc-500 mb-1">USDC</span>
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                            {walletData?.balance?.eth ? `${parseFloat(walletData.balance.eth).toFixed(6)} ETH` : "0 ETH"}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-b border-zinc-800">
                        <button
                            onClick={handleFundWallet}
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            {fundingStatus === "funding" ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Requesting Faucet...
                                </>
                            ) : fundingStatus === "success" ? (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Funds Incoming!
                                </>
                            ) : fundingStatus === "error" ? (
                                "Rate Limited - Try Later"
                            ) : (
                                "Add Testnet Funds"
                            )}
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="p-4 border-b border-zinc-800">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-zinc-500">Total Spent</div>
                                <div className="text-sm font-mono text-white">{walletData?.stats?.totalSpent || "$0.00"}</div>
                            </div>
                            <div>
                                <div className="text-xs text-zinc-500">Network</div>
                                <div className="text-sm text-white">{walletData?.wallet?.network || "Base Sepolia"}</div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Transactions */}
                    {walletData?.recentTransactions && walletData.recentTransactions.length > 0 && (
                        <div className="p-4">
                            <div className="text-xs text-zinc-500 mb-3">Recent Payments</div>
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                {walletData.recentTransactions.slice(0, 5).map((tx) => (
                                    <div key={tx.id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${tx.type === "incoming" ? "bg-green-500" : "bg-blue-500"}`} />
                                            <span className="text-zinc-400">{formatService(tx.service)}</span>
                                        </div>
                                        <span className={`font-mono ${tx.type === "incoming" ? "text-green-400" : "text-zinc-300"}`}>
                                            {tx.type === "incoming" ? "+" : "-"}${tx.amount.toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Address */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={() => {
                                if (walletData?.wallet?.address) {
                                    navigator.clipboard.writeText(walletData.wallet.address);
                                }
                            }}
                            className="w-full text-[10px] text-zinc-600 font-mono truncate hover:text-zinc-400 transition-colors text-left"
                            title="Click to copy"
                        >
                            {walletData?.wallet?.address || "Loading..."}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
