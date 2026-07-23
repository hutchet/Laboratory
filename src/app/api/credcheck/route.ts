import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const envKeys = Object.keys(process.env).filter(k =>
    k.includes("DATABASE") || k.includes("POSTGRES") || k.includes("Hutchet")
  )

  const result: Record<string, string | null> = {}
  for (const key of envKeys) {
    result[key] = process.env[key] ?? null
  }

  return NextResponse.json({ count: envKeys.length, vars: result })
}
