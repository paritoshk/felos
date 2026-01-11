/**
 * x402 Payment Middleware for Next.js
 *
 * DISABLED: Payments are tracked in MongoDB but not enforced via middleware.
 * This allows the app to work without x402 payment blocking.
 */

import { NextRequest, NextResponse } from "next/server";

export async function middleware(_request: NextRequest) {
    // Pass through all requests - payments are simulated/tracked in MongoDB
    return NextResponse.next();
}

// No routes require payment enforcement
export const config = {
    matcher: [],
};
