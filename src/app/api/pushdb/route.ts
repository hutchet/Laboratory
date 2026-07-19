import { NextResponse } from "next/server"
import { execSync } from "child_process"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const out = execSync("npx prisma db push --accept-data-loss 2>&1", {
      cwd: process.cwd(),
      timeout: 30000,
      env: { ...process.env, PATH: process.env.PATH },
    }).toString()
    return NextResponse.json({ ok: true, output: out.slice(-500) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, stderr: e.stderr?.toString()?.slice(-500) }, { status: 500 })
  }
}
