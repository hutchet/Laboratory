import { NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { getUserRbacContext } from "@/shared/lib/rbac"

export const dynamic = "force-dynamic"

export async function GET() {
  const results: string[] = []
  try {
    // Check email okashi1993
    const user = await db.user.findUnique({ where: { email: "okashi1993@gmail.com" } })
    if (!user) return NextResponse.json({ error: "User not found" })
    results.push(`User: ${user.id} / ${user.email}`)

    const roleNames = (await db.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    })).map(ur => ur.role.name)
    results.push(`Roles: ${roleNames.join(", ") || "NONE!"}`)

    const ctx = await getUserRbacContext(user.id)
    results.push(`Rank: ${ctx.rank}`)
    results.push(`ModulePerms: ${ctx.modulePerms.length} permissions`)

    return NextResponse.json({ results, rank: ctx.rank, roles: roleNames })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
