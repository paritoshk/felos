import { MongoClient, Db } from "mongodb";

let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  cachedDb = client.db("felos");
  return cachedDb;
}

// Pricing constants
export const SUBSCRIPTION_COSTS = {
  firecrawl: 99,
  fireworks: 50,
  imageGen: 20,
  copyAi: 30,
  total: 199,
};

export const X402_COSTS = {
  scrape: 0.15,      // Web scraping
  adCopy: 0.25,      // LLM ad copy generation
  llm: 0.25,         // General LLM calls
  fluxSchnell: 0.20,
  fluxDev: 0.30,
  fluxKontextPro: 0.35,
  image: 0.35,       // Image generation
  total: 0.75,       // Typical ad generation total
};

// Transaction logging helper
export async function logTransaction(
  service: string,
  amount: number,
  threadId: string,
  metadata?: Record<string, any>
) {
  const db = await connectToDatabase();
  await db.collection("transactions").insertOne({
    sessionId: threadId,
    service,
    amount,
    durationMs: metadata?.durationMs || 0,
    timestamp: new Date(),
    ...metadata,
  });
}
