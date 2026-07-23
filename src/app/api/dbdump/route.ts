import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const all: Record<string, string | null> = {}

  const keys = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "Hutchet_DATABASE_URL",
    "Hutchet_DATABASE_URL_UNPOOLED",
    "Hutchet_POSTGRES_PASSWORD",
    "Hutchet_POSTGRES_URL",
    "Hutchet_POSTGRES_URL_NON_POOLING",
    "Hutchet_POSTGRES_URL_NO_SSL",
    "Hutchet_POSTGRES_PRISMA_URL",
    "Hutchet_PGPASSWORD",
    "Hutchet_PGHOST",
    "Hutchet_PGUSER",
    "Hutchet_PGDATABASE",
    "Hutchet_NEON_PROJECT_ID",
    "Hutchet_POSTGRES_USER",
    "Hutchet_POSTGRES_HOST",
    "Hutchet_POSTGRES_DATABASE",
  ]

  for (const k of keys) {
    const raw = process.env[k] ?? null
    if (raw && raw.includes("***")) {
      all[k] = "[REDACTED_BY_VERCEL]"
    } else if (raw && raw.includes("[SENSITIVE]")) {
      all[k] = "[SENSITIVE]"
    } else {
      all[k] = raw
    }
  }

  return NextResponse.json({
    count: keys.length,
    vars: all,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  })
}
