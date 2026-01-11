/**
 * CDP Wallet Integration for x402 Payments
 *
 * This module provides wallet functionality for both:
 * - BUYER: Signing x402 payments to external services
 * - SELLER: Receiving payments to a known wallet address
 * - TREASURY: Tracking real fund flows in/out
 */

import { CdpClient } from "@coinbase/cdp-sdk";
import { toAccount, privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia, base } from "viem/chains";
import type { LocalAccount } from "viem";

// CDP EVM Account type (inferred from SDK)
type CdpEvmAccount = Awaited<ReturnType<CdpClient["evm"]["getOrCreateAccount"]>>;

// USDC contract addresses
const USDC_ADDRESSES = {
    "eip155:84532": "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia
    "eip155:8453": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  // Base Mainnet
};

// Demo mode fallback address (a real Base Sepolia address for display purposes)
const DEMO_WALLET_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f5bE91";

// Cached wallet state
let cdpClient: CdpClient | null = null;
let cdpAccount: CdpEvmAccount | null = null;
let walletAddress: string | null = null;
let signer: LocalAccount | null = null;
let demoMode = false;

/**
 * Check if running in demo mode (no Coinbase credentials)
 */
export function isDemoMode(): boolean {
    return !process.env.CDP_API_ID || !process.env.CDP_API_SECRET || !process.env.CDP_WALLET_SECRET;
}

// Network configuration
export const NETWORK_CONFIG = {
    testnet: {
        chainId: "eip155:84532" as const,
        name: "Base Sepolia",
        facilitatorUrl: "https://x402.org/facilitator",
        chain: baseSepolia,
        rpcUrl: "https://sepolia.base.org",
    },
    mainnet: {
        chainId: "eip155:8453" as const,
        name: "Base",
        facilitatorUrl: "https://api.cdp.coinbase.com/platform/v2/x402",
        chain: base,
        rpcUrl: "https://mainnet.base.org",
    },
};

// Get current network config based on environment
export function getNetworkConfig() {
    const network = process.env.X402_NETWORK || "eip155:84532";
    return network === "eip155:8453" ? NETWORK_CONFIG.mainnet : NETWORK_CONFIG.testnet;
}

/**
 * Initialize Coinbase CDP Client
 */
export async function initCdpClient(): Promise<CdpClient> {
    if (cdpClient) return cdpClient;

    const apiKeyId = process.env.CDP_API_ID;
    const apiKeySecret = process.env.CDP_API_SECRET;
    const walletSecret = process.env.CDP_WALLET_SECRET;

    if (!apiKeyId || !apiKeySecret) {
        throw new Error("CDP credentials required: CDP_API_ID, CDP_API_SECRET");
    }

    if (!walletSecret) {
        throw new Error("CDP_WALLET_SECRET required for wallet operations");
    }

    cdpClient = new CdpClient({
        apiKeyId,
        apiKeySecret,
        walletSecret,
    });
    return cdpClient;
}

/**
 * Get or create the CDP EVM account
 */
export async function getCdpAccount(): Promise<CdpEvmAccount> {
    if (cdpAccount) return cdpAccount;

    const client = await initCdpClient();
    cdpAccount = await client.evm.getOrCreateAccount({ name: "felous-x402-wallet" });
    walletAddress = cdpAccount.address;
    console.log(`[Wallet] CDP Wallet initialized: ${walletAddress}`);
    return cdpAccount;
}

/**
 * Get wallet address for receiving payments (SELLER)
 */
export async function getWalletAddress(): Promise<string> {
    if (walletAddress) return walletAddress;

    // Demo mode - return placeholder address
    if (isDemoMode()) {
        demoMode = true;
        walletAddress = DEMO_WALLET_ADDRESS;
        console.log("[Wallet] Running in DEMO mode - add COINBASE_API_ID and COINBASE_API_SECRET for real payments");
        return walletAddress;
    }

    try {
        const account = await getCdpAccount();
        return account.address;
    } catch {
        // Fallback to local private key
        const privateKey = process.env.X402_PRIVATE_KEY;
        if (privateKey) {
            const account = privateKeyToAccount(privateKey as `0x${string}`);
            walletAddress = account.address;
            return walletAddress;
        }
        // Final fallback - demo mode
        demoMode = true;
        walletAddress = DEMO_WALLET_ADDRESS;
        return walletAddress;
    }
}

/**
 * Get wallet signer for signing x402 payments (BUYER)
 * Returns a viem-compatible LocalAccount
 */
export async function getWalletSigner(): Promise<LocalAccount> {
    if (signer) return signer;

    try {
        const account = await getCdpAccount();
        // Convert CDP account to viem-compatible signer
        // CDP SDK's EvmAccount is compatible with viem's toAccount()
        signer = toAccount(account) as LocalAccount;
        return signer;
    } catch (error) {
        // Fallback to local private key signer
        const privateKey = process.env.X402_PRIVATE_KEY;
        if (privateKey) {
            signer = privateKeyToAccount(privateKey as `0x${string}`);
            return signer;
        }
        throw new Error("No signer configuration found");
    }
}

/**
 * Get real wallet balances from the blockchain
 */
export async function getWalletBalance(): Promise<{ usdc: string; eth: string; usdcRaw: bigint; ethRaw: bigint }> {
    try {
        const address = await getWalletAddress();
        const network = getNetworkConfig();

        const publicClient = createPublicClient({
            chain: network.chain,
            transport: http(network.rpcUrl),
        });

        // Get ETH balance
        const ethBalance = await publicClient.getBalance({ address: address as `0x${string}` });

        // Get USDC balance (ERC20)
        const usdcAddress = USDC_ADDRESSES[network.chainId];
        let usdcBalance = BigInt(0);

        try {
            const data = await publicClient.readContract({
                address: usdcAddress as `0x${string}`,
                abi: [
                    {
                        name: "balanceOf",
                        type: "function",
                        stateMutability: "view",
                        inputs: [{ name: "account", type: "address" }],
                        outputs: [{ name: "", type: "uint256" }],
                    },
                ],
                functionName: "balanceOf",
                args: [address as `0x${string}`],
            });
            usdcBalance = data as bigint;
        } catch (e) {
            console.warn("Failed to fetch USDC balance:", e);
        }

        return {
            usdc: formatUnits(usdcBalance, 6), // USDC has 6 decimals
            eth: formatUnits(ethBalance, 18),
            usdcRaw: usdcBalance,
            ethRaw: ethBalance,
        };
    } catch {
        return { usdc: "0.00", eth: "0.00", usdcRaw: BigInt(0), ethRaw: BigInt(0) };
    }
}

/**
 * Request testnet funds from CDP faucet
 */
export async function requestFaucet(): Promise<{ ethTx?: string; usdcTx?: string }> {
    const client = await initCdpClient();
    const account = await getCdpAccount();
    const results: { ethTx?: string; usdcTx?: string } = {};

    try {
        // Request ETH
        const ethFaucet = await client.evm.requestFaucet({
            address: account.address,
            network: "base-sepolia",
            token: "eth",
        });
        results.ethTx = ethFaucet.transactionHash;
        console.log(`[Faucet] ETH: https://sepolia.basescan.org/tx/${ethFaucet.transactionHash}`);
    } catch (e) {
        console.warn("ETH faucet failed (rate limited?):", e);
    }

    try {
        // Request USDC
        const usdcFaucet = await client.evm.requestFaucet({
            address: account.address,
            network: "base-sepolia",
            token: "usdc",
        });
        results.usdcTx = usdcFaucet.transactionHash;
        console.log(`[Faucet] USDC: https://sepolia.basescan.org/tx/${usdcFaucet.transactionHash}`);
    } catch (e) {
        console.warn("USDC faucet failed (rate limited?):", e);
    }

    return results;
}

/**
 * Treasury status - complete wallet overview
 */
export async function getTreasuryStatus(): Promise<{
    address: string;
    network: string;
    chainId: string;
    balance: { usdc: string; eth: string };
    explorerUrl: string;
}> {
    const address = await getWalletAddress();
    const network = getNetworkConfig();
    const balance = await getWalletBalance();

    const explorerBase = network.chainId === "eip155:8453"
        ? "https://basescan.org"
        : "https://sepolia.basescan.org";

    return {
        address,
        network: network.name,
        chainId: network.chainId,
        balance: { usdc: balance.usdc, eth: balance.eth },
        explorerUrl: `${explorerBase}/address/${address}`,
    };
}

/**
 * Log treasury status
 */
export async function logTreasuryStatus(): Promise<void> {
    try {
        const status = await getTreasuryStatus();
        console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      x402 TREASURY STATUS                          ║
╠════════════════════════════════════════════════════════════════════╣
║  Address:  ${status.address}       ║
║  Network:  ${status.network.padEnd(54)}║
║  USDC:     ${status.balance.usdc.padEnd(54)}║
║  ETH:      ${status.balance.eth.substring(0, 10).padEnd(54)}║
║  Explorer: ${status.explorerUrl.substring(0, 54).padEnd(54)}║
╚════════════════════════════════════════════════════════════════════╝
`);
    } catch (error) {
        console.warn("Treasury not configured:", error);
    }
}
