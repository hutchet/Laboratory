// Prisma client dung chung
// Node.js runtime (Vercel) — PrismaClient chuẩn
// Edge runtime (Cloudflare) — dùng PrismaNeonHTTP adapter (không dùng ở đây)

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
