import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  // Only return safe env vars (no secrets!)
  const safe = {
    VERCEL_ENV: process.env.VERCEL_ENV,
    NODE_ENV: process.env.NODE_ENV,
    HAS_DB_URL: !!process.env.DATABASE_URL,
    HAS_AUTH_SECRET: !!process.env.AUTH_SECRET,
    HAS_POSTGRES_URL: !!process.env.Hutchet_POSTGRES_URL,
    HAS_POSTGRES_PRISMA_URL: !!process.env.Hutchet_POSTGRES_PRISMA_URL,
    HAS_HUTCHET_DB: !!process.env.Hutchet_DATABASE_URL,
  }
  return NextResponse.json(safe)
}
