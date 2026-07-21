"use client"
// Engine phan quyen dung chung phia client -- thay cho cach an/hien nut lam tay
// rieng tung trang. Phuc dung dung tinh than PERM_RANK/canDo/applyRolePermissions
// cua ban goc, nhung lay du lieu tu session Auth.js + bang Role/Permission thuc
// (khong con dung localStorage gia lap nhu ban goc).
import { createContext, useContext, useMemo, type ReactNode } from "react"

// Nâng cấp từ 4 cấp lên 6 cấp bậc (thiết kế: Tài khoản 6 cấp bậc + Phân vùng dữ liệu
// theo Trung tâm thử nghiệm & Nhóm vận hành). Giữ "manager"/"admin" làm alias trỏ về
// dept_head/director để không phải sửa lại toàn bộ chỗ dùng minPerm cũ trong 1 lần.
export type PermRank = "viewer" | "technician" | "engineer" | "team_lead" | "dept_head" | "director" | "manager" | "admin"

export const PERM_RANK: Record<PermRank, number> = {
  viewer: 0,
  technician: 1,
  engineer: 2,
  team_lead: 3,
  dept_head: 4,
  manager: 4, // alias cũ = dept_head
  director: 5,
  admin: 5, // alias cũ = director
}

export const PERM_LABELS: Record<string, string> = {
  viewer: "Người xem",
  technician: "Kỹ thuật viên",
  engineer: "Kỹ sư",
  team_lead: "Trưởng nhóm",
  dept_head: "Trưởng phòng",
  director: "Giám đốc",
  manager: "Trưởng phòng",
  admin: "Giám đốc",
}

export type RBACContextValue = {
  rank: PermRank
  roleNames: string[]
  modulePerms: string[] // dạng "module:action", ví dụ "quote:edit"
  // Additive (phân vùng theo Trung tâm/Nhóm vận hành) — hiển thị badge/label phía client;
  // việc lọc dữ liệu thật luôn thực hiện ở server qua getScopeFilter(), không dựa vào các
  // trường này để bảo vệ dữ liệu.
  centerId?: string | null
  centerName?: string | null
  groupId?: string | null
  isOperations?: boolean
  allCenters?: boolean
}

const RBACContext = createContext<RBACContextValue>({
  rank: "viewer",
  roleNames: [],
  modulePerms: [],
  centerId: null,
  centerName: null,
  groupId: null,
  isOperations: false,
  allCenters: false,
})

export function RBACProvider({
  value,
  children,
}: {
  value: RBACContextValue
  children: ReactNode
}) {
  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>
}

export function useRBAC() {
  const ctx = useContext(RBACContext)
  return useMemo(() => {
    const canDo = (minPerm: PermRank) => PERM_RANK[ctx.rank] >= PERM_RANK[minPerm]
    const canModule = (mod: string, action: string) =>
      ctx.modulePerms.includes(`${mod}:${action}`) ||
      ctx.modulePerms.includes(`*:${action}`) ||
      ctx.modulePerms.includes(`${mod}:*`)
    return { ...ctx, canDo, canModule, label: PERM_LABELS[ctx.rank] }
  }, [ctx])
}

// Thay cho thuộc tính data-perm="manager" trong bản gốc: bọc quanh nút/khối cần
// ẩn theo quyền. Ví dụ: <Perm minPerm="dept_head"><button>Xoá</button></Perm>
export function Perm({
  minPerm,
  children,
  fallback = null,
}: {
  minPerm: PermRank
  children: ReactNode
  fallback?: ReactNode
}) {
  const { canDo } = useRBAC()
  if (!canDo(minPerm)) return <>{fallback}</>
  return <>{children}</>
}

// Badge hiển thị vai trò hiện tại, tương đương #active-role-badge bản gốc.
export function RoleBadge({ className }: { className?: string }) {
  const { label } = useRBAC()
  return <span className={className}>{label}</span>
}

// Additive — badge hiển thị Trung tâm/Nhóm vận hành hiện tại của người dùng, dùng ở
// đầu các trang Tầng 2-3 (bên cạnh RoleBadge) để nhắc phạm vi dữ liệu đang xem.
export function ScopeBadge({ className }: { className?: string }) {
  const { centerName, isOperations, allCenters, rank } = useRBAC()
  if (rank === "director" || rank === "admin" || allCenters) return <span className={className}>Toàn bộ các Trung tâm</span>
  if (isOperations) return <span className={className}>Nhóm vận hành (xem chéo Trung tâm)</span>
  return <span className={className}>{centerName || "Chưa gán Trung tâm"}</span>
}
