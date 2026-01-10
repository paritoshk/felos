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
  llm: 0.02,
  image: 0.06,
  total: 0.09,
};
