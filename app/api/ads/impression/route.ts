/**
 * Ad Impression Tracking API
 *
 * Protected by x402 middleware - requires $0.0001 USDC payment per impression.
 * This endpoint is called when an advertisement is displayed to a user.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { adId, campaignId, userId, placement } = body;

        // Record the impression in database
        const db = await connectToDatabase();
        const impression = await db.collection("ad_impressions").insertOne({
            adId: adId || "unknown",
            campaignId: campaignId || "unknown",
            userId: userId || "anonymous",
            placement: placement || "unknown",
            timestamp: new Date(),
            ip: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent") || "unknown",
            paymentSettled: true,
        });

        return NextResponse.json({
            success: true,
            impressionId: impression.insertedId.toString(),
            message: "Ad impression recorded",
        });
    } catch (error) {
        console.error("Ad impression error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to record impression" },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    return NextResponse.json({
        endpoint: "/api/ads/impression",
        method: "POST",
        price: "$0.0001 USDC",
        network: process.env.X402_NETWORK || "eip155:84532",
        description: "Record an ad impression. Payment required via x402.",
        parameters: {
            adId: "string - Unique ad identifier",
            campaignId: "string - Campaign identifier",
            userId: "string (optional) - User identifier",
            placement: "string (optional) - Ad placement location",
        },
    });
}
