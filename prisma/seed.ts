// Du lieu khoi tao RBAC: 5 vai tro + quyen theo module, dung `npm run prisma:seed` sau khi da `prisma migrate dev`
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const MODULES = ["tasks", "projects", "equipment", "quote", "purchase", "auditplan", "settings", "members", "customers", "report"]
const ACTIONS = ["view", "create", "edit", "delete", "approve"]

// Ma tran quyen theo vai tro -- chinh sua truc tiep tai day khi nhu cau thay doi
const ROLE_PERMISSIONS: Record<string, Array<{ module: string; actions: string[] }>> = {
  admin: MODULES.map((m) => ({ module: m, actions: ACTIONS })),
  manager: [
    { module: "tasks", actions: ["view", "create", "edit"] },
    { module: "projects", actions: ["view", "create", "edit"] },
    { module: "equipment", actions: ["view"] },
    { module: "quote", actions: ["view", "create", "edit", "approve"] },
    { module: "purchase", actions: ["view", "approve"] },
    { module: "report", actions: ["view"] },
    { module: "customers", actions: ["view", "create", "edit"] },
  ],
  technician: [
    { module: "tasks", actions: ["view", "edit"] },
    { module: "equipment", actions: ["view", "create", "edit"] },
    { module: "auditplan", actions: ["view", "edit"] },
  ],
  quote_staff: [
    { module: "quote", actions: ["view", "create", "edit"] },
    { module: "purchase", actions: ["view", "create"] },
  ],
  viewer: MODULES.map((m) => ({ module: m, actions: ["view"] })),
}

async function main() {
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action },
      })
    }
  }

  for (const [roleName, grants] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    })
    for (const grant of grants) {
      for (const action of grant.actions) {
        const permission = await prisma.permission.findUnique({
          where: { module_action: { module: grant.module, action } },
        })
        if (!permission) continue
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        })
      }
    }
  }

  console.log("Seed RBAC hoan tat: 5 vai tro (admin, manager, technician, quote_staff, viewer)")
}

main().finally(() => prisma.$disconnect())
