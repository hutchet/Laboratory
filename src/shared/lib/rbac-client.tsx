"use client"
// Engine phan quyen dung chung phia client -- thay cho cach an/hien nut lam tay
// rieng tung trang. Phuc dung dung tinh than PERM_RANK/canDo/applyRolePermissions
// cua ban goc, nhung lay du lieu tu session Auth.js + bang Role/Permission thuc
// (khong con dung localStorage gia lap nhu ban goc).
import { createContext, useContext, useMemo, type ReactNode } from "react"

export type PermRank = "viewer" | "technician" | "manager" | "admin"

export const PERM_RANK: Record<PermRank, number> = {
  viewer: 0,
  technician: 1,
  manager: 2,
  admin: 3,
}

export const PERM_LABELS: Record<PermRank, string> = {
  viewer: "Người xem",
  technician: "Kỹ thuật viên",
  manager: "Quản lý",
  admin: "Quản trị",
}

export type RBACContextValue = {
  rank: PermRank
  roleNames: string[]
  modulePerms: string[] // dạng "module:action", ví dụ "quote:edit"
}

const RBACContext = createContext<RBACContextValue>({
  rank: "viewer",
  roleNames: [],
  modulePerms: [],
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
// ẩn theo quyền. Ví dụ: <Perm minPerm="manager"><button>Xoá</button></Perm>
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
