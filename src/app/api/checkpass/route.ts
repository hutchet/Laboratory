import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await prisma.user.findUnique({ where: { email: "okashi1993@gmail.com" } })
    if (!user) return NextResponse.json({ ok: false, reason: "User not found" })
    
    const hash = user.passwordHash
    const valid = hash ? await bcrypt.compare("admin123", hash) : false
    
    // Also check: maybe hash is stored in wrong format
    return NextResponse.json({
      ok: true,
      userId: user.id,
      hasHash: !!hash,
      hashPrefix: hash ? hash.substring(0, 20) + "..." : "none",
      hashLength: hash ? hash.length : 0,
      passwordValid: valid,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
