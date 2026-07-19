// Kiem tra quyen theo module/action -- dung trong Server Components, Route Handlers, hoac middleware
import { db } from "@/shared/lib/db"

export type ModuleName =
  | "dash" | "tasks" | "projects" | "centers" | "equipment" | "quote" | "purchase"
  | "auditplan" | "settings" | "members" | "customers" | "report"
  | "samples" | "plan" | "quality"

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

export async function can(userId: string, mod: ModuleName, action: ActionName): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms.has(`${mod}:${action}`) || perms.has(`*:${action}`) || perms.has(`${mod}:*`)
}

// Xep hang chung (tuong duong PERM_RANK ban goc) tu ten cac Role da gan cho user --
// dung de dieu khien an/hien nut o phia client (component Perm trong lib/rbac-client.tsx).
// quote_staff duoc coi tuong duong technician ve rank chung (rieng module quote/customers
// van dung can()/module permission thuc, chinh xac hon rank chung).
const RANK_BY_ROLE: Record<string, number> = {
  admin: 3,
  manager: 2,
  technician: 1,
  quote_staff: 1,
  viewer: 0,
}
const RANK_NAMES = ["viewer", "technician", "manager", "admin"] as const
export type RankName = (typeof RANK_NAMES)[number]

export async function getUserRoleNames(userId: string): Promise<string[]> {
  const roles = await db.userRole.findMany({
    where: { userId },
    include: { role: true },
  })
  return roles.map((ur) => ur.role.name)
}

export async function getUserRank(userId: string): Promise<RankName> {
  const roleNames = await getUserRoleNames(userId)
  let best = 0
  for (const name of roleNames) {
    const r = RANK_BY_ROLE[name] ?? 0
    if (r > best) best = r
  }
  return RANK_NAMES[best]
}

export async function getUserRbacContext(userId: string): Promise<{
  rank: RankName
  roleNames: string[]
  modulePerms: string[]
}> {
  const [roleNames, perms] = await Promise.all([
    getUserRoleNames(userId),
    getUserPermissions(userId),
  ])
  let best = 0
  for (const name of roleNames) {
    const r = RANK_BY_ROLE[name] ?? 0
    if (r > best) best = r
  }
  return { rank: RANK_NAMES[best], roleNames, modulePerms: Array.from(perms) }
}
