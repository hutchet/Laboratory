import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const dynamic = "force-dynamic"

const ROLE_PERMISSIONS: Record<string, Array<{ module: string; action: string }>> = {
  admin: [
    { module: "*", action: "view" },
    { module: "*", action: "create" },
    { module: "*", action: "edit" },
    { module: "*", action: "delete" },
    { module: "*", action: "approve" },
  ],
  manager: [
    { module: "tasks", action: "view" },
    { module: "tasks", action: "create" },
    { module: "tasks", action: "edit" },
    { module: "projects", action: "view" },
    { module: "projects", action: "edit" },
    { module: "equipment", action: "view" },
    { module: "equipment", action: "edit" },
    { module: "quote", action: "view" },
    { module: "quote", action: "approve" },
  ],
  technician: [
    { module: "tasks", action: "view" },
    { module: "tasks", action: "edit" },
    { module: "equipment", action: "view" },
  ],
  quote_staff: [
    { module: "quote", action: "view" },
    { module: "quote", action: "create" },
    { module: "quote", action: "edit" },
    { module: "customers", action: "view" },
  ],
  viewer: [
    { module: "tasks", action: "view" },
    { module: "projects", action: "view" },
    { module: "quote", action: "view" },
  ],
}

export async function GET() {
  const results: string[] = []

  try {
    // 1. Check if user exists
    const existing = await prisma.user.findUnique({ where: { email: "okashi1993@gmail.com" } })
    if (existing) {
      results.push(`User already exists: ${existing.email} (passwordHash: ${existing.passwordHash ? "set" : "EMPTY!"})`)
    }

    // 2. Seed roles
    let roleCount = 0
    for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await prisma.role.upsert({
        where: { name: roleName },
        update: {},
        create: { name: roleName },
      })
      roleCount++
      for (const perm of perms) {
        await prisma.permission.upsert({
          where: { roleId_module_action: { roleId: role.id, module: perm.module, action: perm.action } },
          update: {},
          create: { roleId: role.id, module: perm.module, action: perm.action },
        })
      }
    }
    results.push(`Roles: ${roleCount} created`)

    // 3. Upsert admin user + member
    const hash = await bcrypt.hash("admin123", 10)
    const user = await prisma.user.upsert({
      where: { email: "okashi1993@gmail.com" },
      update: { passwordHash: hash, name: "Nguyễn Hà" },
      create: { email: "okashi1993@gmail.com", passwordHash: hash, name: "Nguyễn Hà" },
    })
    results.push(`User: ${user.email} (id: ${user.id}, hasHash: ${!!user.passwordHash})`)

    await prisma.member.upsert({
      where: { email: "okashi1993@gmail.com" },
      update: { name: "Nguyễn Hà", role: "admin", accessRole: "admin" },
      create: { email: "okashi1993@gmail.com", name: "Nguyễn Hà", code: "ADMIN", role: "admin", accessRole: "admin" },
    })
    results.push("Member record created")

    // 4. Ensure UserRole exists — critical for RBAC (getUserRbacContext reads UserRole table)
    const directorRole = await prisma.role.findUnique({ where: { name: "director" } })
    const adminAliasRole = await prisma.role.findUnique({ where: { name: "admin" } })
    for (const role of [directorRole, adminAliasRole].filter(Boolean)) {
      if (role) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: role.id } },
          update: {},
          create: { userId: user.id, roleId: role.id },
        })
      }
    }
    results.push("UserRole (director+admin) synced")

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, stack: e.stack?.split("\n").slice(0, 5) }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
