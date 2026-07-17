import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

const ROLE_PERMISSIONS: Record<string, Array<{ module: string; action: string }>> = {
  admin: [
    { module: "*", action: "view" }, { module: "*", action: "create" },
    { module: "*", action: "edit" }, { module: "*", action: "delete" }, { module: "*", action: "approve" },
  ],
  manager: [
    { module: "tasks", action: "view" }, { module: "tasks", action: "create" }, { module: "tasks", action: "edit" },
    { module: "projects", action: "view" }, { module: "projects", action: "edit" },
    { module: "equipment", action: "view" }, { module: "equipment", action: "edit" },
    { module: "quote", action: "view" }, { module: "quote", action: "approve" },
  ],
  technician: [
    { module: "tasks", action: "view" }, { module: "tasks", action: "edit" }, { module: "equipment", action: "view" },
  ],
  quote_staff: [
    { module: "quote", action: "view" }, { module: "quote", action: "create" }, { module: "quote", action: "edit" },
    { module: "customers", action: "view" },
  ],
  viewer: [
    { module: "tasks", action: "view" }, { module: "projects", action: "view" }, { module: "quote", action: "view" },
  ],
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const email = req.nextUrl.searchParams.get("email")
  const password = req.nextUrl.searchParams.get("password")
  if (!email || !password) {
    return NextResponse.json({ error: "missing email/password" }, { status: 400 })
  }

  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await db.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } })
    for (const perm of perms) {
      await db.permission.upsert({
        where: { roleId_module_action: { roleId: role.id, module: perm.module, action: perm.action } },
        update: {},
        create: { roleId: role.id, module: perm.module, action: perm.action },
      })
    }
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: "Admin" },
  })

  const adminRole = await db.role.findUnique({ where: { name: "admin" } })
  if (adminRole) {
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
      update: {},
      create: { userId: user.id, roleId: adminRole.id },
    })
  }

  return NextResponse.json({ ok: true, userId: user.id })
}
