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
  // Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
  // Nhom van hanh. 4 vai tro moi duoi day cong voi 5 vai tro cu (giu nguyen ben tren
  // de khong pha du lieu UserRole hien co tren Neon) tao thanh day 6 cap: director >
  // dept_head > team_lead > engineer > technician > viewer (quote_staff la vai tro
  // ngang hang, chuyen trach bao gia, khong nam trong day cap bac chinh).
  director: [
    { module: "*", action: "view" },
    { module: "*", action: "create" },
    { module: "*", action: "edit" },
    { module: "*", action: "delete" },
    { module: "*", action: "approve" },
  ],
  dept_head: [
    { module: "tasks", action: "view" },
    { module: "tasks", action: "create" },
    { module: "tasks", action: "edit" },
    { module: "tasks", action: "delete" },
    { module: "projects", action: "view" },
    { module: "projects", action: "create" },
    { module: "projects", action: "edit" },
    { module: "samples", action: "view" },
    { module: "samples", action: "create" },
    { module: "samples", action: "edit" },
    { module: "purchase", action: "view" },
    { module: "purchase", action: "create" },
    { module: "purchase", action: "edit" },
    { module: "auditplan", action: "view" },
    { module: "auditplan", action: "create" },
    { module: "auditplan", action: "edit" },
    { module: "equipment", action: "view" },
    { module: "equipment", action: "edit" },
    { module: "quote", action: "view" },
    { module: "quote", action: "approve" },
    { module: "members", action: "view" },
    { module: "members", action: "create" },
    { module: "members", action: "edit" },
  ],
  team_lead: [
    { module: "tasks", action: "view" },
    { module: "tasks", action: "create" },
    { module: "tasks", action: "edit" },
    { module: "samples", action: "view" },
    { module: "samples", action: "create" },
    { module: "samples", action: "edit" },
    { module: "purchase", action: "view" },
    { module: "purchase", action: "create" },
    { module: "projects", action: "view" },
    { module: "equipment", action: "view" },
    { module: "quote", action: "view" },
  ],
  engineer: [
    { module: "tasks", action: "view" },
    { module: "tasks", action: "edit" },
    { module: "samples", action: "view" },
    { module: "samples", action: "edit" },
    { module: "equipment", action: "view" },
    { module: "projects", action: "view" },
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
