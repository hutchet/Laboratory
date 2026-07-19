import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

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

async function main() {
  // 1. Seed roles + permissions
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    })

    for (const perm of perms) {
      await prisma.permission.upsert({
        where: {
          roleId_module_action: {
            roleId: role.id,
            module: perm.module,
            action: perm.action,
          },
        },
        update: {},
        create: { roleId: role.id, module: perm.module, action: perm.action },
      })
    }
  }

  console.log("Seed RBAC hoan tat: 5 vai tro da duoc tao.")

  // 2. Seed admin user (Auth.js User model — separate from Member)
  const hash = await bcrypt.hash("admin123", 10)
  const adminUser = await prisma.user.upsert({
    where: { email: "okashi1993@gmail.com" },
    update: { passwordHash: hash, name: "Nguyễn Hà" },
    create: {
      email: "okashi1993@gmail.com",
      passwordHash: hash,
      name: "Nguyễn Hà",
    },
  })
  console.log(`Admin user: ${adminUser.email} (${adminUser.id})`)

  // 3. Seed Member record (for sidebar/display — separate from Auth.js User)
  await prisma.member.upsert({
    where: { email: "okashi1993@gmail.com" },
    update: { name: "Nguyễn Hà", role: "admin", accessRole: "admin" },
    create: {
      email: "okashi1993@gmail.com",
      name: "Nguyễn Hà",
      code: "ADMIN",
      role: "admin",
      accessRole: "admin",
    },
  })
  console.log("Member record created for admin.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
