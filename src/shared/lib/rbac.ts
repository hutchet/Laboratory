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

// ================== THIET KE 6 CAP BAC + PHAN VUNG THEO TRUNG TAM/NHOM ==================
// Xep hang chung (tuong duong PERM_RANK ban goc) tu ten cac Role da gan cho user.
// Giu nguyen cac ten role CU (admin/manager/quote_staff/viewer/technician) lam alias tro
// ve dung cap bac moi -- KHONG doi ten/xoa Role cu trong DB de khong lam vo UserRole da
// gan tren du lieu that (Neon). Role MOI duoc them them trong prisma/seed.ts, khong thay
// the role cu.
const RANK_BY_ROLE: Record<string, number> = {
  director: 5,
  admin: 5, // alias cu
  dept_head: 4,
  manager: 4, // alias cu
  team_lead: 3,
  engineer: 2,
  technician: 1,
  quote_staff: 1, // alias cu, tuong duong technician
  viewer: 0,
}
const RANK_NAMES = ["viewer", "technician", "engineer", "team_lead", "dept_head", "director"] as const
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

export type RbacContext = {
  userId: string
  rank: RankName
  roleNames: string[]
  modulePerms: string[]
  // Additive (phan vung theo Trung tam/Nhom van hanh):
  centerId: string | null
  centerName: string | null
  groupId: string | null
  isOperations: boolean
  // Danh sach centerId ma 1 Nguoi xem (viewer) duoc cap quyen xem rieng (ViewerCenterAccess).
  viewerCenterIds: string[]
}

export async function getUserRbacContext(userId: string): Promise<RbacContext> {
  const [roleNames, perms, member, user] = await Promise.all([
    getUserRoleNames(userId),
    getUserPermissions(userId),
    db.member.findFirst({ where: { email: (await db.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email ?? "__none__" }, include: { center: true } }),
    db.user.findUnique({ where: { id: userId }, include: { center: true } }),
  ])
  let best = 0
  for (const name of roleNames) {
    const r = RANK_BY_ROLE[name] ?? 0
    if (r > best) best = r
  }
  // Member la nguon du lieu chinh cho centerId/groupId/isOperations (duoc dong bo tu
  // syncUserRoleForMember trong features/members/actions.ts); User chi la ban sao du phong
  // neu vi ly do nao khong tim thay Member tuong ung qua email.
  const centerId = member?.centerId ?? user?.centerId ?? null
  const centerName = member?.center?.name ?? user?.center?.name ?? null
  const groupId = member?.groupId ?? user?.groupId ?? null
  const isOperations = member?.isOperations ?? user?.isOperations ?? false
  const viewerAccess = await db.viewerCenterAccess.findMany({ where: { userId }, select: { centerId: true } })
  return {
    userId,
    rank: RANK_NAMES[best],
    roleNames,
    modulePerms: Array.from(perms),
    centerId,
    centerName,
    groupId,
    isOperations,
    viewerCenterIds: viewerAccess.map((v) => v.centerId),
  }
}

// Cac module "van hanh ngang" (Nhom van hanh - Operations) duoc xem/quan ly xuyen suot
// moi Trung tam, khong bi chan boi phan vung centerId/groupId (thiet ke muc 5 & muc 11).
export const OPERATIONS_CROSS_CENTER_MODULES = new Set<string>([
  "equipment",
  "bookings",
  "depreciation",
  "variablecost",
  "quality",
  "auditplan",
])

// Bo loc Prisma `where` dung de gioi han pham vi du lieu theo cap bac + Trung tam/Nhom.
// module la 1 khoa "scope module" (co the khac ModuleName, vi du "bookings"/"depreciation"),
// dung de tra bang OPERATIONS_CROSS_CENTER_MODULES o tren.
//
// - director: khong loc gi (thay toan bo).
// - Nhom van hanh (isOperations=true) + module thuoc danh sach cross-center: khong loc gi.
// - dept_head: loc theo centerId cua chinh minh (thay tat ca Nhom trong Trung tam do).
// - team_lead / engineer / technician: loc theo groupId cua chinh minh (chi thay du lieu
//   cua Nhom minh). Neu chua duoc gan Nhom (groupId=null) -> khong thay gi (chan tao du
//   lieu "mo coi" ngoai nhom, dung thiet ke muc 7).
// - viewer: chi thay du lieu cua cac Trung tam duoc cap trong ViewerCenterAccess; khong co
//   quyen ghi (chan o requirePermission()/can(), khong phai o day).
export function getScopeFilter(ctx: RbacContext, scopeModule: string): Record<string, unknown> {
  if (ctx.rank === "director") return {}
  if (ctx.isOperations && OPERATIONS_CROSS_CENTER_MODULES.has(scopeModule)) return {}
  if (ctx.rank === "dept_head") {
    return { centerId: ctx.centerId ?? "__none__" }
  }
  if (ctx.rank === "team_lead" || ctx.rank === "engineer" || ctx.rank === "technician") {
    return { groupId: ctx.groupId ?? "__none__" }
  }
  // viewer
  return { centerId: { in: ctx.viewerCenterIds.length ? ctx.viewerCenterIds : ["__none__"] } }
}

// Bien the danh cho cac bang chi co centerId (khong co groupId rieng), vi du Project/
// Equipment/EquipmentBooking/AuditPlan khi ban muon loc rong hon o cap Trung tam ngay ca
// voi team_lead/engineer/technician (vi cac bang nay chua tach duoc theo Nhom). Dung ham
// nay cho cac bang "chi co centerId", va getScopeFilter() cho cac bang "co ca centerId va
// groupId" (Task/Sample/PurchaseItem).
export function getCenterScopeFilter(ctx: RbacContext, scopeModule: string): Record<string, unknown> {
  if (ctx.rank === "director") return {}
  if (ctx.isOperations && OPERATIONS_CROSS_CENTER_MODULES.has(scopeModule)) return {}
  if (ctx.rank === "viewer") {
    return { centerId: { in: ctx.viewerCenterIds.length ? ctx.viewerCenterIds : ["__none__"] } }
  }
  // dept_head/team_lead/engineer/technician deu thuoc 1 Trung tam duy nhat -> cung xem
  // theo Trung tam do cho cac bang khong co truong groupId rieng.
  return { centerId: ctx.centerId ?? "__none__" }
}

// Kiem tra 1 rank co >= rank toi thieu yeu cau khong (dung o server, tuong duong Perm o client).
export function rankAtLeast(rank: RankName, min: RankName): boolean {
  return RANK_BY_ROLE[rank] >= RANK_BY_ROLE[min]
}

// Chan sua/xoa du lieu ngoai pham vi Trung tam/Nhom ngay ca khi tai khoan co quyen module
// (can()) -- vi can() chi kiem tra "co duoc sua module nay khong", khong biet ban ghi cu
// the thuoc Trung tam/Nhom nao. Goi ham nay TRUOC khi update/delete, truyen vao ban ghi
// hien co (centerId/groupId) vua doc tu DB.
// - record = null (khong tim thay ban ghi): bo qua, de caller tu xu ly 404.
// - record.centerId/groupId = null (du lieu cu chua gan Trung tam/Nhom): cho qua, vi day
//   la du lieu "chung" tao truoc khi nang cap thiet ke nay (xem muc "backfill du lieu cu"
//   trong changelog) -- tranh khoa cung nguoi dung voi du lieu legacy.
export function assertScopedAccess(
  ctx: RbacContext,
  scopeModule: string,
  record: { centerId?: string | null; groupId?: string | null } | null | undefined,
): void {
  if (!record) return
  if (ctx.rank === "director") return
  if (ctx.isOperations && OPERATIONS_CROSS_CENTER_MODULES.has(scopeModule)) return
  if (ctx.rank === "viewer") {
    // Viewer khong co quyen ghi (da chan o can()/requirePermission tu truoc) -- neu loi vao
    // day nghia la co bug o tang permission, van chan lai cho chac.
    throw new Error("Không có quyền chỉnh sửa dữ liệu này")
  }
  if (ctx.rank === "dept_head") {
    if (record.centerId && record.centerId !== ctx.centerId) {
      throw new Error("Không có quyền: dữ liệu này thuộc Trung tâm khác")
    }
    return
  }
  // team_lead / engineer / technician
  if (record.groupId && record.groupId !== ctx.groupId) {
    throw new Error("Không có quyền: dữ liệu này thuộc Nhóm vận hành khác")
  }
  if (!record.groupId && record.centerId && record.centerId !== ctx.centerId) {
    // Ban ghi co centerId nhung khong co groupId (vi du Project/Equipment/AuditPlan cap
    // Trung tam) -- van chan cheo Trung tam cho cap team_lead/engineer/technician.
    throw new Error("Không có quyền: dữ liệu này thuộc Trung tâm khác")
  }
}
