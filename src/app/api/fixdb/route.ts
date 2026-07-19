import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const result = await prisma.$executeRawUnsafe(`ALTER TABLE "TestItem" ADD COLUMN IF NOT EXISTS "picId" TEXT;`)
    return NextResponse.json({ ok: true, result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
