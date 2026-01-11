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
        <div className="bg-zinc-900/90 border border-zinc-700 rounded-xl p-4 my-3 max-w-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${walletData ? "bg-green-500" : "bg-zinc-500"}`} />
                    <span className="text-sm font-medium text-white">x402 Wallet</span>
                </div>
                <span className="text-xs text-zinc-500">{walletData?.wallet?.network || "Base Sepolia"}</span>
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-3 mb-3">
                <div className="text-xs text-zinc-500 mb-1">Balance</div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-bold text-white">${balance.toFixed(2)}</span>
                    <span className="text-xs text-zinc-500">USDC</span>
                </div>
                {walletData?.balance?.eth && (
                    <div className="text-xs text-zinc-500 mt-1">
                        {parseFloat(walletData.balance.eth).toFixed(6)} ETH
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between text-xs mb-3">
                <span className="text-zinc-500">Session Spent</span>
                <span className="text-zinc-300 font-mono">{walletData?.stats?.totalSpent || "$0.00"}</span>
            </div>

            <button
                onClick={handleFund}
                disabled={fundingStatus === "funding"}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
                {fundingStatus === "funding" ? "Requesting..." :
                 fundingStatus === "success" ? "Funds Incoming!" :
                 fundingStatus === "error" ? "Rate Limited" :
                 "Add Testnet Funds"}
            </button>

            {walletData?.wallet?.address && (
                <button
                    onClick={() => navigator.clipboard.writeText(walletData.wallet.address)}
                    className="w-full mt-2 text-[10px] text-zinc-600 font-mono truncate hover:text-zinc-400 transition-colors"
                    title="Click to copy"
                >
                    {walletData.wallet.address}
                </button>
            )}
        </div>
    );
}
