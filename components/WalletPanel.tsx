"use client";

import { useState, useEffect } from "react";

export function WalletPanel() {
    const [balance, setBalance] = useState<string>("0");
    const [address, setAddress] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "paying" | "success" | "error">("idle");

    // Fetch wallet status from our backend API
    useEffect(() => {
        fetch("/api/wallet")
            .then((res) => res.json())
            .then((data) => {
                if (data.wallet?.address) {
                    setAddress(data.wallet.address);
                    setBalance(data.balance?.usdc || "0");
                }
            })
            .catch((err) => console.error("Failed to fetch wallet info:", err));
    }, []);

    const handleFundWallet = async () => {
        if (address) {
            // Request faucet funds
            setLoading(true);
            try {
                const res = await fetch("/api/wallet", { method: "POST" });
                const data = await res.json();
                if (data.success) {
                    alert(`Faucet requested! Check transactions:\nETH: ${data.transactions.eth || 'pending'}\nUSDC: ${data.transactions.usdc || 'pending'}`);
                    // Refresh balance after a delay
                    setTimeout(() => {
                        fetch("/api/wallet")
                            .then((res) => res.json())
                            .then((data) => setBalance(data.balance?.usdc || "0"));
                    }, 5000);
                } else {
                    alert("Faucet request failed - may be rate limited");
                }
            } catch (e) {
                alert("Faucet error: " + String(e));
            } finally {
                setLoading(false);
            }
        }
    };

    const handleTestPayment = async () => {
        setLoading(true);
        setStatus("paying");
        try {
            // Simulate a test payment by calling the click endpoint directly
            // (middleware is disabled, so this will just log to MongoDB)
            const response = await fetch("/api/ads/click", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    adId: "test-ad-123",
                    campaignId: "test-campaign-1",
                    userId: "demo-user"
                }),
            });

            if (response.ok) {
                setStatus("success");
                setTimeout(() => setStatus("idle"), 3000);
            } else {
                throw new Error("Request failed");
            }
        } catch (error) {
            console.error("Test payment error:", error);
            setStatus("error");
            setTimeout(() => setStatus("idle"), 3000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl p-4 w-80">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-white">x402 Wallet</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${address ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-xs text-zinc-400">{address ? "Connected" : "Loading..."}</span>
                    </div>
                </div>

                {address ? (
                    <div className="space-y-4">
                        <div className="bg-zinc-950 rounded p-3 border border-zinc-800">
                            <div className="text-xs text-zinc-500 mb-1">USDC Balance</div>
                            <div className="text-xl font-mono text-white">${balance}</div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleFundWallet}
                                disabled={loading}
                                className="flex-1 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-sm rounded transition-colors"
                            >
                                {loading ? "..." : "Fund Wallet"}
                            </button>
                            <button
                                onClick={handleTestPayment}
                                disabled={loading}
                                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded transition-colors"
                            >
                                {loading ? "..." : "Test Pay $0.001"}
                            </button>
                        </div>

                        {status === "success" && (
                            <div className="text-xs text-green-400 text-center">Payment Logged ✓</div>
                        )}
                        {status === "error" && (
                            <div className="text-xs text-red-400 text-center">Request Failed ✕</div>
                        )}

                        <div className="text-[10px] text-zinc-600 font-mono truncate">
                            {address}
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-zinc-400 text-center py-4">
                        Loading wallet...
                    </div>
                )}
            </div>
        </div>
    );
}
