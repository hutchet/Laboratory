import { cookies } from "next/headers"
import type { SimRole } from "./types"

// Tương đương CUR_ROLE_KEY='tf_active_role_v1' + currentPerm()/applyRolePermissions()
// (dòng 5417-5428 bản gốc): giả lập vai trò CHỈ ở lớp hiển thị UI (Perm/useRBAC phía
// client), KHÔNG thay đổi phân quyền thực thi thật ở server — mọi Server Action vẫn
// dùng can(session.user.id, ...) với vai trò THẬT của tài khoản đang đăng nhập. Khác
// bản HTML gốc (chạy 1 mình trên máy, không có server, nên "giả lập vai trò" ở đó
// CHÍNH LÀ toàn bộ cơ chế phân quyền) — ứng dụng này có nhiều người dùng thật với
// RBAC thật, nên giả lập chỉ để xem thử giao diện theo vai trò khác, không thể dùng để
// vượt quyền.
export const SIM_ROLE_COOKIE = "tf_active_role_v1"

export async function getSimRole(): Promise<SimRole> {
  const jar = await cookies()
  const v = jar.get(SIM_ROLE_COOKIE)?.value
  if (v === "admin" || v === "manager" || v === "technician" || v === "viewer") return v
  return ""
}
