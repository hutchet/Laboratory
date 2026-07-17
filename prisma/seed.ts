import { PrismaClient } from "@prisma/client"

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
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
