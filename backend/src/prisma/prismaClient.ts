import { PrismaClient } from "@prisma/client";

// Export placeholder mock client for tests to populate
export const prismaMock = {
  user: {
    findUnique: (() => {}) as any,
    findFirst: (() => {}) as any,
    findMany: (() => {}) as any,
    create: (() => {}) as any,
    update: (() => {}) as any,
    delete: (() => {}) as any,
    upsert: (() => {}) as any,
    count: (() => {}) as any,
  },
  reporterProfile: {
    findUnique: (() => {}) as any,
    create: (() => {}) as any,
    update: (() => {}) as any,
    upsert: (() => {}) as any,
  },
  phoneNumber: {
    findUnique: (() => {}) as any,
    findFirst: (() => {}) as any,
    findMany: (() => {}) as any,
    create: (() => {}) as any,
    update: (() => {}) as any,
    delete: (() => {}) as any,
    count: (() => {}) as any,
    groupBy: (() => {}) as any,
  },
  report: {
    findUnique: (() => {}) as any,
    findFirst: (() => {}) as any,
    findMany: (() => {}) as any,
    create: (() => {}) as any,
    update: (() => {}) as any,
    delete: (() => {}) as any,
    count: (() => {}) as any,
    groupBy: (() => {}) as any,
    updateMany: (() => {}) as any,
  },
  evidence: {
    create: (() => {}) as any,
  },
  appeal: {
    findUnique: (() => {}) as any,
    findMany: (() => {}) as any,
    create: (() => {}) as any,
    update: (() => {}) as any,
    count: (() => {}) as any,
  },
  watchlist: {
    findMany: (() => {}) as any,
    create: (() => {}) as any,
    delete: (() => {}) as any,
  },
  notification: {
    create: (() => {}) as any,
  },
  auditLog: {
    create: (() => {}) as any,
    findMany: (() => {}) as any,
    count: (() => {}) as any,
  },
  refreshToken: {
    findUnique: (() => {}) as any,
    create: (() => {}) as any,
    update: (() => {}) as any,
    deleteMany: (() => {}) as any,
    updateMany: (() => {}) as any,
  },
};

const globalForPrisma = globalThis as unknown as { prisma: any };

export const prisma =
  process.env.NODE_ENV === "test"
    ? prismaMock
    : globalForPrisma.prisma ||
      new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
      });

if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
