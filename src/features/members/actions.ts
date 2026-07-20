"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "members", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

// Sửa lỗi RBAC phát hiện khi rà lại P0 (Nền tảng): trước đây đổi "Phân quyền" của
// thành viên ở trang này CHỈ ghi vào Member.accessRole (hiển thị) mà KHÔNG hề đồng
// bộ với bảng UserRole thật — nghĩa là quyền hạn thực thi ở Server Action (can())
// không hề đổi theo, khác hẳn bản gốc (memberPerm/canDo đọc trực tiếp field admin
// của member, luôn đúng 100%). Ngoài ra bản viết lại trước đây KHÔNG có cách nào để
// tạo tài khoản đăng nhập (User+passwordHash) từ trong app — chỉ có thể thêm Member,
// không có User tương ứng nên tài khoản đó không đăng nhập được. Hàm dưới đây đồng bộ
// thật: tạo/cập nhật User theo email + gán đúng 1 Role (theo tên accessRole, đã có sẵn
// từ prisma/seed.ts) vào UserRole, thay cho toàn bộ role cũ của user đó.
async function syncUserRoleForMember(email: string | null, accessRole: string | null, password?: string | null) {
  if (!email) return
  const roleName = accessRole || "viewer"
  const role = await db.role.findUnique({ where: { name: roleName } })
  if (!role) return // seed RBAC chưa chạy — không có Role tương ứng để gán, bỏ qua
  let user = await db.user.findUnique({ where: { email } })
  if (!user) {
    if (!password) return // chưa từng có tài khoản đăng nhập và không đặt mật khẩu mới thì không tạo được
    const passwordHash = await bcrypt.hash(password, 10)
    user = await db.user.create({ data: { email, passwordHash } })
  } else if (password) {
    const passwordHash = await bcrypt.hash(password, 10)
    await db.user.update({ where: { id: user.id }, data: { passwordHash } })
  }
  await db.userRole.deleteMany({ where: { userId: user.id } })
  await db.userRole.create({ data: { userId: user.id, roleId: role.id } })
}

export type SaveMemberInput = {
  id?: string
  name: string
  code?: string | null
  email?: string | null
  gender?: string | null
  team?: string | null
  accessRole?: string | null
  password?: string | null
}

export async function saveMember(input: SaveMemberInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    name: input.name,
    code: input.code || null,
    email: input.email || null,
    gender: input.gender || null,
    team: input.team || null,
    accessRole: input.accessRole || "viewer",
  }
  if (input.id) {
    await db.member.update({ where: { id: input.id }, data })
    await logAudit("member", "update", data.name, `Cập nhật thành viên “${data.name}”`)
  } else {
    const created = await db.member.create({ data })
    await logAudit("member", "create", data.name, `Thêm thành viên mới “${data.name}” (#${created.id})`)
  }
  try {
    await syncUserRoleForMember(data.email, data.accessRole, input.password)
  } catch (e) {
    // Không để lỗi đồng bộ RBAC (ví dụ seed chưa chạy) làm hỏng việc lưu thành viên —
    // ghi log để biết, nhưng Member vẫn được lưu như bình thường.
    console.error("syncUserRoleForMember error:", e)
  }
  revalidatePath("/members")
}

export async function deleteMember(id: string) {
  await requirePermission("delete")
  const existing = await db.member.findUnique({ where: { id } })
  await db.member.delete({ where: { id } })
  await logAudit("member", "delete", existing?.name || id, `Xoá thành viên “${existing?.name || id}”`)
  revalidatePath("/members")
}
