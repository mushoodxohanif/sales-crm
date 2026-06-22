import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  db: PrismaClient | undefined;
};

function createDbClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma.db ?? createDbClient();

/** Neon / remote Postgres can exceed Prisma's default 5s interactive transaction limit. */
export const interactiveTransactionOptions = {
  maxWait: 10_000,
  timeout: 15_000,
} as const;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.db = db;
}
