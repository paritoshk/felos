/**
 * Wallet Status API
 *
 * Returns real-time wallet address and balance from the blockchain.
 * Tracks x402 payment flows: money IN (ad clicks) and money OUT (services).
 */

import { NextResponse } from "next/server";
import { getTreasuryStatus, requestFaucet, getNetworkConfig } from "@/lib/wallet";
import { connectToDatabase } from "@/lib/db";

export async function GET() {
    try {
        const status = await getTreasuryStatus();
        const network = getNetworkConfig();

        // Get recent transactions from MongoDB
        let recentTransactions: any[] = [];
        let totalReceived = 0;
        let totalSpent = 0;

        try {
            const db = await connectToDatabase();

            // Get incoming payments (as seller)
            const incoming = await db
                .collection("x402_incoming")
                .find({})
                .sort({ timestamp: -1 })
                .limit(10)
                .toArray() as any[];

            // Get outgoing payments (as buyer)
            const outgoing = await db
                .collection("transactions")
                .find({})
                .sort({ timestamp: -1 })
                .limit(10)
                .toArray() as any[];

            recentTransactions = [
                ...incoming.map((t) => ({ ...t, type: "incoming" })),
                ...outgoing.map((t) => ({ ...t, type: "outgoing" })),
            ].sort((a, b) => {
                const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                return bTime - aTime;
            });

            totalReceived = incoming.reduce((sum, t) => sum + (t.amount || 0), 0);
            totalSpent = outgoing.reduce((sum, t) => sum + (t.amount || 0), 0);
        } catch {
            // DB not available
        }

        return NextResponse.json({
            wallet: {
                address: status.address,
                network: status.network,
                chainId: status.chainId,
                explorerUrl: status.explorerUrl,
            },
            balance: {
                usdc: status.balance.usdc,
                eth: status.balance.eth,
            },
            x402: {
                enabled: status.address !== "0x0000000000000000000000000000000000000000",
                role: "buyer_and_seller",
                facilitator: network.facilitatorUrl,
                endpoints: [
                    { path: "/api/ads/click", price: "$0.001", description: "Ad click tracking" },
                    { path: "/api/ads/impression", price: "$0.0001", description: "Ad impression" },
                    { path: "/api/campaigns/create", price: "$1.00", description: "Campaign creation" },
                ],
            },
            stats: {
                totalReceived: `$${totalReceived.toFixed(4)}`,
                totalSpent: `$${totalSpent.toFixed(4)}`,
                netFlow: `$${(totalReceived - totalSpent).toFixed(4)}`,
            },
            recentTransactions: recentTransactions.slice(0, 10).map((t) => ({
                id: t._id?.toString(),
                type: t.type,
                service: t.service,
                amount: t.amount,
                timestamp: t.timestamp,
                txHash: t.txHash,
            })),
        });
    } catch (error) {
        console.error("Wallet status error:", error);
        return NextResponse.json(
            {
                wallet: { address: null, error: "Wallet not configured" },
                balance: { usdc: "0.00", eth: "0.00" },
                x402: { enabled: false },
                stats: { totalReceived: "$0.00", totalSpent: "$0.00", netFlow: "$0.00" },
                recentTransactions: [],
            },
            { status: 500 }
        );
    }
}

// POST endpoint to request faucet funds (testnet only)
export async function POST() {
    try {
        const network = getNetworkConfig();

        if (network.chainId !== "eip155:84532") {
            return NextResponse.json(
                { error: "Faucet only available on testnet (Base Sepolia)" },
                { status: 400 }
            );
        }

        const result = await requestFaucet();

        return NextResponse.json({
            success: true,
            message: "Faucet request submitted",
            transactions: {
                eth: result.ethTx
                    ? `https://sepolia.basescan.org/tx/${result.ethTx}`
                    : null,
                usdc: result.usdcTx
                    ? `https://sepolia.basescan.org/tx/${result.usdcTx}`
                    : null,
            },
        });
    } catch (error) {
        console.error("Faucet error:", error);
        return NextResponse.json(
            { error: "Failed to request faucet funds", details: String(error) },
            { status: 500 }
        );
    }
}
