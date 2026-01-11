"use client";

import { useState, useEffect } from "react";

interface WalletData {
    wallet: {
        address: string;
        network: string;
    };
    balance: {
        usdc: string;
        eth: string;
    };
    stats: {
        totalSpent: string;
    };
}

export function WalletWidget() {
    const [walletData, setWalletData] = useState<WalletData | null>(null);
    const [fundingStatus, setFundingStatus] = useState<"idle" | "funding" | "success" | "error">("idle");

    useEffect(() => {
        fetchWallet();
        const interval = setInterval(fetchWallet, 15000);
        return () => clearInterval(interval);
    }, []);

    const fetchWallet = async () => {
        try {
            const res = await fetch("/api/wallet");
            const data = await res.json();
            setWalletData(data);
        } catch (err) {
            console.error("Failed to fetch wallet:", err);
        }
    };

    const handleFund = async () => {
        setFundingStatus("funding");
        try {
            const res = await fetch("/api/wallet", { method: "POST" });
            const data = await res.json();
            if (data.success) {
                setFundingStatus("success");
                setTimeout(fetchWallet, 5000);
                setTimeout(() => setFundingStatus("idle"), 8000);
            } else {
                setFundingStatus("error");
                setTimeout(() => setFundingStatus("idle"), 3000);
            }
        } catch {
            setFundingStatus("error");
            setTimeout(() => setFundingStatus("idle"), 3000);
        }
    };

    const balance = parseFloat(walletData?.balance?.usdc || "0");

    return (
        <div className="space-y-4">
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${walletData ? "bg-green-500 animate-pulse" : "bg-zinc-500"}`} />
                <span className="text-xs text-zinc-400">
                    {walletData ? "Connected" : "Connecting..."}
                </span>
                <span className="text-xs text-zinc-600 ml-auto">
                    {walletData?.wallet?.network || "Base Sepolia"}
                </span>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-zinc-700/50">
                <div className="text-xs text-zinc-500 mb-1">Available Balance</div>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-bold text-white">${balance.toFixed(2)}</span>
                    <span className="text-xs text-zinc-500">USDC</span>
                </div>
                {walletData?.balance?.eth && (
                    <div className="text-xs text-zinc-500 mt-2">
                        {parseFloat(walletData.balance.eth).toFixed(6)} ETH
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Session Spent</span>
                    <span className="text-sm font-mono text-white">{walletData?.stats?.totalSpent || "$0.00"}</span>
                </div>
            </div>

            {/* Fund Button */}
            <button
                onClick={handleFund}
                disabled={fundingStatus === "funding"}
                className={`w-full py-3 text-sm font-medium rounded-lg transition-all ${
                    fundingStatus === "success"
                        ? "bg-green-600 text-white"
                        : fundingStatus === "error"
                        ? "bg-red-600/50 text-red-200"
                        : fundingStatus === "funding"
                        ? "bg-zinc-700 text-zinc-400"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                }`}
            >
                {fundingStatus === "funding" ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Requesting...
                    </span>
                ) : fundingStatus === "success" ? (
                    <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Funds Incoming!
                    </span>
                ) : fundingStatus === "error" ? (
                    "Rate Limited - Try Later"
                ) : (
                    "Add Testnet Funds"
                )}
            </button>

            {/* Wallet Address */}
            {walletData?.wallet?.address && (
                <div className="pt-2 border-t border-zinc-800">
                    <div className="text-xs text-zinc-600 mb-1">Wallet Address</div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(walletData.wallet.address);
                        }}
                        className="w-full text-[11px] text-zinc-500 font-mono break-all hover:text-zinc-300 transition-colors text-left leading-relaxed"
                        title="Click to copy"
                    >
                        {walletData.wallet.address}
                    </button>
                </div>
            )}
        </div>
    );
}
