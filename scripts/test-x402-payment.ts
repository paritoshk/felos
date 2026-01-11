/**
 * Test x402 Payment Script
 *
 * Run this to test making a REAL x402 payment:
 *   npx tsx scripts/test-x402-payment.ts
 *
 * This will:
 * 1. Initialize your CDP wallet as the signer
 * 2. Make a request to x402.org test endpoint
 * 3. Automatically sign and submit payment
 * 4. Show the transaction hash
 */

import "dotenv/config";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { getWalletSigner, getTreasuryStatus } from "../lib/wallet";

// x402 test endpoint that accepts payments
const TEST_ENDPOINT = "https://x402.org/test/weather";

async function main() {
    console.log("\n🧪 Testing x402 Payment Flow\n");
    console.log("=".repeat(60));

    try {
        // Step 1: Get treasury status
        console.log("\n1️⃣  Getting treasury status...");
        const status = await getTreasuryStatus();
        console.log(`   Address: ${status.address}`);
        console.log(`   Network: ${status.network}`);
        console.log(`   USDC Balance: ${status.balance.usdc}`);

        if (parseFloat(status.balance.usdc) < 0.01) {
            console.log("\n⚠️  Low USDC balance! Request faucet funds first:");
            console.log("   npx tsx scripts/treasury-status.ts\n");
            // Continue anyway to show the 402 response
        }

        // Step 2: Initialize x402 client with CDP signer
        console.log("\n2️⃣  Initializing x402 client...");
        const signer = await getWalletSigner();
        console.log(`   Signer address: ${signer.address}`);

        const client = new x402Client();
        registerExactEvmScheme(client, { signer });

        const fetchWithPayment = wrapFetchWithPayment(globalThis.fetch, client);

        // Step 3: Make request to test endpoint
        console.log("\n3️⃣  Making request to x402 test endpoint...");
        console.log(`   URL: ${TEST_ENDPOINT}`);

        const response = await fetchWithPayment(TEST_ENDPOINT, {
            method: "GET",
        });

        console.log(`   Response status: ${response.status}`);

        // Step 4: Check payment result
        if (response.ok) {
            console.log("\n✅ Payment successful!");

            const httpClient = new x402HTTPClient(client);
            try {
                const paymentResponse = httpClient.getPaymentSettleResponse(
                    (name) => response.headers.get(name)
                );
                if (paymentResponse) {
                    console.log(`   Transaction: ${JSON.stringify(paymentResponse, null, 2)}`);
                }
            } catch {
                // No payment header
            }

            const data = await response.json();
            console.log("\n📦 Response data:");
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(`\n❌ Request failed with status ${response.status}`);

            // Check if it's a 402 that wasn't handled
            if (response.status === 402) {
                const paymentHeader = response.headers.get("payment-required");
                if (paymentHeader) {
                    const decoded = JSON.parse(atob(paymentHeader));
                    console.log("\nPayment required:");
                    console.log(JSON.stringify(decoded, null, 2));
                }
            }
        }

        // Step 5: Show updated balance
        console.log("\n5️⃣  Checking updated balance...");
        const newStatus = await getTreasuryStatus();
        console.log(`   USDC Balance: ${newStatus.balance.usdc}`);

    } catch (error) {
        console.error("\n❌ Error:", error);
        process.exit(1);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✨ Test complete!\n");
}

main();
