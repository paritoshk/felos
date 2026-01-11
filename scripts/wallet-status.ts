/**
 * Wallet Status Script
 *
 * Run this to check your x402 wallet status:
 *   npx tsx scripts/wallet-status.ts
 *
 * This will:
 * 1. Initialize/get your CDP wallet
 * 2. Show real USDC and ETH balances on Base Sepolia
 * 3. Display the wallet address to add to X402_WALLET_ADDRESS
 */

import "dotenv/config";
import { logTreasuryStatus, getTreasuryStatus, requestFaucet } from "../lib/wallet";

async function main() {
    console.log("\n💰 Felous x402 Wallet Status\n");
    console.log("=".repeat(60));

    try {
        // Get and display wallet status
        await logTreasuryStatus();

        const status = await getTreasuryStatus();

        console.log("\n📋 Environment Variable to set:");
        console.log("=".repeat(60));
        console.log(`X402_WALLET_ADDRESS=${status.address}`);

        console.log("\n💡 Add this to your .env file to receive x402 payments!\n");

        // Check if we need to request faucet
        if (parseFloat(status.balance.usdc) === 0 && status.chainId === "eip155:84532") {
            console.log("💸 Balance is zero. Requesting testnet funds...\n");
            const faucetResult = await requestFaucet();

            if (faucetResult.ethTx || faucetResult.usdcTx) {
                console.log("✅ Faucet request submitted!");
                console.log("   Wait ~30 seconds then run this script again to see updated balance.\n");
            }
        }

        console.log("🔗 View on block explorer:");
        console.log(`   ${status.explorerUrl}\n`);

    } catch (error) {
        console.error("❌ Error:", error);
        console.log("\n📋 Make sure you have these environment variables set:");
        console.log("   COINBASE_API_ID=your-api-key-id");
        console.log("   COINBASE_API_SECRET=your-api-key-secret");
        console.log("\n   Get these from https://cdp.coinbase.com\n");
        process.exit(1);
    }
}

main();
