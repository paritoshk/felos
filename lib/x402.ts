import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

// x402 client singleton
let x402ClientInstance: x402Client | null = null;
let paymentFetch: typeof fetch | null = null;

export interface X402PaymentResult {
  success: boolean;
  txHash?: string;
  amount?: string;
  error?: string;
}

export async function initX402Client() {
  if (x402ClientInstance) return { client: x402ClientInstance, fetch: paymentFetch! };

  // Check if we have a private key for signing
  const privateKey = process.env.X402_PRIVATE_KEY;

  if (!privateKey) {
    console.warn("X402_PRIVATE_KEY not set - x402 payments disabled");
    return { client: null, fetch: globalThis.fetch };
  }

  try {
    // Create signer from private key
    const signer = privateKeyToAccount(privateKey as `0x${string}`);

    // Create x402 client and register EVM scheme (Base network)
    x402ClientInstance = new x402Client();
    registerExactEvmScheme(x402ClientInstance, { signer });

    // Wrap fetch with payment handling
    paymentFetch = wrapFetchWithPayment(globalThis.fetch, x402ClientInstance);

    console.log("x402 client initialized with address:", signer.address);

    return { client: x402ClientInstance, fetch: paymentFetch };
  } catch (error) {
    console.error("Failed to initialize x402 client:", error);
    return { client: null, fetch: globalThis.fetch };
  }
}

// Make a request that may require x402 payment
export async function x402Fetch(
  url: string,
  options?: RequestInit
): Promise<{ response: Response; payment?: X402PaymentResult }> {
  const { client, fetch: fetchFn } = await initX402Client();

  try {
    const response = await fetchFn(url, options);

    // Check if payment was made
    let payment: X402PaymentResult | undefined;
    if (client && response.ok) {
      const httpClient = new x402HTTPClient(client);
      try {
        const paymentResponse = httpClient.getPaymentSettleResponse(
          (name) => response.headers.get(name)
        );
        if (paymentResponse) {
          const pr = paymentResponse as { txHash?: string; amount?: string };
          payment = {
            success: true,
            txHash: pr.txHash,
            amount: pr.amount,
          };
        }
      } catch {
        // No payment was required
      }
    }

    return { response, payment };
  } catch (error) {
    return {
      response: new Response(JSON.stringify({ error: String(error) }), { status: 500 }),
      payment: { success: false, error: String(error) },
    };
  }
}

// Discover x402-enabled services from the Bazaar
export async function discoverX402Services() {
  try {
    const response = await fetch(
      "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources"
    );
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Failed to discover x402 services:", error);
    return [];
  }
}

// Simulated x402 payment tracking (for demo when real x402 services unavailable)
export interface X402Transaction {
  id: string;
  service: string;
  amount: number;
  currency: string;
  timestamp: Date;
  status: "pending" | "settled" | "simulated";
  txHash?: string;
}

const transactions: X402Transaction[] = [];

export function recordX402Transaction(
  service: string,
  amount: number,
  status: "settled" | "simulated" = "simulated",
  txHash?: string
): X402Transaction {
  const tx: X402Transaction = {
    id: `x402_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    service,
    amount,
    currency: "USDC",
    timestamp: new Date(),
    status,
    txHash,
  };
  transactions.push(tx);
  return tx;
}

export function getX402Transactions(): X402Transaction[] {
  return [...transactions];
}

export function getTotalX402Spent(): number {
  return transactions.reduce((sum, tx) => sum + tx.amount, 0);
}
