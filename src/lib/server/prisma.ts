import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../../../generated/prisma/client"

const globalForPrisma = globalThis as {
  prisma?: PrismaClient
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL or DIRECT_URL is required for Prisma")
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

