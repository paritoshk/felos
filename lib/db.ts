import { MongoClient, Db } from "mongodb";

let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const client = await MongoClient.connect(process.env.MONGODB_URI!);
  cachedDb = client.db("adgen");
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
  scrape: 0.01,
  adCopy: 0.02,
  llm: 0.02,
  fluxSchnell: 0.03,
  fluxDev: 0.06,
  image: 0.06,
  total: 0.09,
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
