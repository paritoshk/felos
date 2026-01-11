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
        const interval = setInterval(fetchWallet, 10000);
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

    // Calculate available balance (wallet balance minus spent)
    const walletBalance = parseFloat(walletData?.balance?.usdc || "0");
    const spent = parseFloat(walletData?.stats?.totalSpent?.replace("$", "") || "0");
    const availableBalance = Math.max(0, walletBalance - spent);
    const isLowBalance = availableBalance < 0.50;

    return (
        <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${walletData ? "bg-green-500" : "bg-zinc-500"}`} />
                <span className="text-xs text-zinc-400">
                    {walletData ? "Connected" : "Connecting..."}
                </span>
                <span className="text-xs text-zinc-600 ml-auto">
                    {walletData?.wallet?.network || "Base Sepolia"}
                </span>
            </div>

            {/* Available Balance (after spending) */}
            <div className={`rounded-xl p-4 border ${isLowBalance ? "bg-red-900/20 border-red-800/50" : "bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-zinc-700/50"}`}>
                <div className="text-xs text-zinc-500 mb-1">Available Balance</div>
                <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-mono font-bold ${isLowBalance ? "text-red-400" : "text-white"}`}>
                        ${availableBalance.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-500">USDC</span>
                </div>
                {walletData?.balance?.eth && (
                    <div className="text-xs text-zinc-500 mt-1">
                        {parseFloat(walletData.balance.eth).toFixed(6)} ETH (gas)
                    </div>
                )}
            </div>

            {/* Spending Stats */}
            <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Wallet Balance</span>
                    <span className="text-zinc-400 font-mono">${walletBalance.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Session Spent</span>
                    <span className="text-orange-400 font-mono">-${spent.toFixed(2)}</span>
                </div>
                <div className="border-t border-zinc-700 pt-2 flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Available</span>
                    <span className={`font-mono font-medium ${isLowBalance ? "text-red-400" : "text-green-400"}`}>
                        ${availableBalance.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Low balance warning */}
            {isLowBalance && (
                <div className="text-xs text-red-400 bg-red-900/20 rounded-lg p-2 text-center">
                    Low balance - add funds to continue
                </div>
            )}

            {/* Fund Button */}
            <button
                onClick={handleFund}
                disabled={fundingStatus === "funding"}
                className={`w-full py-2.5 text-sm font-medium rounded-lg transition-all ${
                    fundingStatus === "success"
                        ? "bg-green-600 text-white"
                        : fundingStatus === "error"
                        ? "bg-red-600/50 text-red-200"
                        : fundingStatus === "funding"
                        ? "bg-zinc-700 text-zinc-400"
                        : isLowBalance
                        ? "bg-orange-600 hover:bg-orange-500 text-white"
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
                    "Funds Incoming!"
                ) : fundingStatus === "error" ? (
                    "Rate Limited"
                ) : isLowBalance ? (
                    "Add Funds Now"
                ) : (
                    "Add Testnet Funds"
                )}
            </button>

            {/* Wallet Address */}
            {walletData?.wallet?.address && (
                <button
                    onClick={() => navigator.clipboard.writeText(walletData.wallet.address)}
                    className="w-full text-[10px] text-zinc-600 font-mono truncate hover:text-zinc-400 transition-colors"
                    title="Click to copy"
                >
                    {walletData.wallet.address}
                </button>
            )}
        </div>
    );
}
