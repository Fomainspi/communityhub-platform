import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  communityHubPrisma?: PrismaClient;
};

/**
 * Reuse one Prisma client during local hot reloads to avoid opening
 * a new connection pool on every module reload.
 */
export const prisma =
  globalForPrisma.communityHubPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.communityHubPrisma = prisma;
}
