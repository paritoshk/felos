/**
 * Ad Click Tracking API
 *
 * Protected by x402 middleware - requires $0.001 USDC payment per click.
 * This endpoint is called when a user clicks on an advertisement.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { adId, campaignId, userId, redirectUrl } = body;

        // Record the click in database
        const db = await connectToDatabase();
        const click = await db.collection("ad_clicks").insertOne({
            adId: adId || "unknown",
            campaignId: campaignId || "unknown",
            userId: userId || "anonymous",
            timestamp: new Date(),
            ip: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent") || "unknown",
            // x402 payment info will be added by middleware
            paymentSettled: true,
        });

        return NextResponse.json({
            success: true,
            clickId: click.insertedId.toString(),
            message: "Ad click recorded",
            redirectUrl,
        });
    } catch (error) {
        console.error("Ad click error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to record click" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    // Provide pricing info for clients
    return NextResponse.json({
        endpoint: "/api/ads/click",
        method: "POST",
        price: "$0.001 USDC",
        network: process.env.X402_NETWORK || "eip155:84532",
        description: "Record an ad click. Payment required via x402.",
        parameters: {
            adId: "string - Unique ad identifier",
            campaignId: "string - Campaign identifier",
            userId: "string (optional) - User identifier",
            redirectUrl: "string (optional) - URL to redirect after click",
        },
    });
}
