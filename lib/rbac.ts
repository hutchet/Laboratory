// Kiem tra quyen theo module/action -- dung trong Server Components, Route Handlers, hoac middleware
import { db } from "@/lib/db"

export type ModuleName =
  | "tasks" | "projects" | "equipment" | "quote" | "purchase"
  | "auditplan" | "settings" | "members" | "customers" | "report"

export type ActionName = "view" | "create" | "edit" | "delete" | "approve"

// Cache trong 1 request -- goi lai nhieu lan trong 1 lan render khong query lai DB
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  const roles = await db.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: true } } },
  })
  const perms = new Set<string>()
  for (const ur of roles) {
    for (const p of ur.role.permissions) {
      perms.add(`${p.module}:${p.action}`)
    }
  }
  return perms
}

export async function can(userId: string, module: ModuleName, action: ActionName): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms.has(`${module}:${action}`) || perms.has(`*:${action}`)
}
