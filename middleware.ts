/**
 * x402 Payment Middleware for Next.js
 *
 * This middleware protects API routes requiring x402 payments:
 * - /api/ads/click - Charge per ad click ($0.001)
 * - /api/ads/impression - Charge per impression ($0.0001)
 *
 * Payments go directly to your CDP Treasury wallet on Base Sepolia.
 */

import { NextRequest, NextResponse } from "next/server";

// Network configuration - must be CAIP-2 format
const NETWORK = (process.env.X402_NETWORK || "eip155:84532") as `${string}:${string}`;

// Facilitator URL
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// Wallet address for receiving payments - set this to your CDP wallet address
// Get this by running: npx tsx scripts/treasury-status.ts
const PAY_TO = process.env.X402_WALLET_ADDRESS || "0x0000000000000000000000000000000000000000";

// Route pricing configuration
const ROUTE_PRICING: Record<string, { price: string; description: string }> = {
    "/api/ads/click": { price: "$0.001", description: "Track ad click and redirect user" },
    "/api/ads/impression": { price: "$0.0001", description: "Record ad impression" },
    "/api/campaigns/create": { price: "$1.00", description: "Create a new advertising campaign" },
};

// Lazy load x402 server to avoid initialization issues
let x402Server: any = null;
let paymentMiddleware: any = null;

async function getPaymentMiddleware() {
    if (paymentMiddleware) return paymentMiddleware;

    try {
        const { paymentProxy } = await import("@x402/next");
        const { x402ResourceServer, HTTPFacilitatorClient } = await import("@x402/core/server");
        const { ExactEvmScheme } = await import("@x402/evm/exact/server");

        const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

        x402Server = new x402ResourceServer(facilitatorClient).register(
            NETWORK,
            new ExactEvmScheme()
        );

        const routes: Record<string, any> = {};
        for (const [path, config] of Object.entries(ROUTE_PRICING)) {
            routes[path] = {
                accepts: [
                    {
                        scheme: "exact",
                        price: config.price,
                        network: NETWORK,
                        payTo: PAY_TO,
                    },
                ],
                description: config.description,
                mimeType: "application/json",
            };
        }

        paymentMiddleware = paymentProxy(routes, x402Server);
        return paymentMiddleware;
    } catch (error) {
        console.error("Failed to initialize x402 middleware:", error);
        return null;
    }
}

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    // Check if this route requires payment
    const requiresPayment = Object.keys(ROUTE_PRICING).some(
        (route) => pathname.startsWith(route.replace("/:path*", ""))
    );

    if (!requiresPayment) {
        return NextResponse.next();
    }

    // Log payment attempt
    console.log(`[x402] Payment required for ${pathname}`);
    console.log(`[x402] PayTo: ${PAY_TO}`);
    console.log(`[x402] Network: ${NETWORK}`);

    // Get the payment middleware
    const handler = await getPaymentMiddleware();
    if (!handler) {
        console.warn("[x402] Middleware not initialized, allowing request");
        return NextResponse.next();
    }

    // Execute the payment middleware
    return handler(request);
}

// Configure which routes the middleware applies to
export const config = {
    matcher: ["/api/ads/:path*", "/api/campaigns/:path*"],
};
