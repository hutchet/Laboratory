import { NextResponse } from "next/server"
import { db } from "@/shared/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const results: string[] = []
  try {
    // 1. Force member.accessRole = admin
    const member = await db.member.update({
      where: { email: "okashi1993@gmail.com" },
      data: { accessRole: "admin" },
    })
    results.push(`Member accessRole set to ${member.accessRole}`)

    // 2. Get user
    const user = await db.user.findUnique({ where: { email: "okashi1993@gmail.com" } })
    if (!user) return NextResponse.json({ error: "User not found" })

    // 3. Clear all existing UserRole, add director + admin
    await db.userRole.deleteMany({ where: { userId: user.id } })

    const directorRole = await db.role.findUnique({ where: { name: "director" } })
    const adminRole = await db.role.findUnique({ where: { name: "admin" } })
    const addedRoles: string[] = []

    for (const role of [directorRole, adminRole].filter(Boolean)) {
      if (role) {
        await db.userRole.create({ data: { userId: user.id, roleId: role.id } })
        addedRoles.push(role.name)
      }
    }
    results.push(`UserRole synced: ${addedRoles.join(", ") || "NONE!"}`)

    // 4. Verify
    const roles = (await db.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    })).map(r => r.role.name)
    results.push(`Final roles: ${roles.join(", ")}`)

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
