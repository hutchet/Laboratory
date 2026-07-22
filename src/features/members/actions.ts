"use server"

import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can, getUserRbacContext, rankAtLeast, assertScopedAccess } from "@/shared/lib/rbac"
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
async function syncUserRoleForMember(
  email: string | null,
  accessRole: string | null,
  password: string | null | undefined,
  centerId: string | null,
  groupId: string | null,
  isOperations: boolean,
  allCenters: boolean,
) {
  if (!email) return
  const roleName = accessRole || "viewer"
  const role = await db.role.findUnique({ where: { name: roleName } })
  if (!role) return // seed RBAC chưa chạy — không có Role tương ứng để gán, bỏ qua
  let user = await db.user.findUnique({ where: { email } })
  if (!user) {
    if (!password) return // chưa từng có tài khoản đăng nhập và không đặt mật khẩu mới thì không tạo được
    const passwordHash = await bcrypt.hash(password, 10)
    user = await db.user.create({ data: { email, passwordHash, centerId, groupId, isOperations, allCenters } })
  } else {
    const updateData: { passwordHash?: string; centerId: string | null; groupId: string | null; isOperations: boolean; allCenters: boolean } = { centerId, groupId, isOperations, allCenters }
    if (password) updateData.passwordHash = await bcrypt.hash(password, 10)
    await db.user.update({ where: { id: user.id }, data: updateData })
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
  // Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
  // Nhom van hanh.
  centerId?: string | null
  groupId?: string | null
  isOperations?: boolean
  allCenters?: boolean
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
    centerId: input.centerId || null,
    groupId: input.groupId || null,
    isOperations: !!input.isOperations,
    allCenters: !!input.allCenters,
  }
  if (input.id) {
    await db.member.update({ where: { id: input.id }, data })
    await logAudit("member", "update", data.name, `Cập nhật thành viên “${data.name}”`)
  } else {
    const created = await db.member.create({ data })
    await logAudit("member", "create", data.name, `Thêm thành viên mới “${data.name}” (#${created.id})`)
  }
  try {
    await syncUserRoleForMember(data.email, data.accessRole, input.password, data.centerId, data.groupId, data.isOperations, data.allCenters)
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

export async function bulkDeleteMembers(ids: string[]) {
  await requirePermission("delete")
  await db.member.deleteMany({ where: { id: { in: ids } } })
  await logAudit("member", "delete", `${ids.length} thành viên`, `Xoá hàng loạt ${ids.length} thành viên`)
  revalidatePath("/members")
}

// Additive — cho phép Trưởng phòng trở lên (kể cả Giám đốc) đặt lại mật khẩu đăng
// nhập của một thành viên khác mà không cần biết mật khẩu cũ, theo yêu cầu thiết kế
// lại trang login (đăng nhập bằng mã nhân viên + admin có quyền reset mật khẩu user).
// Đây là hành động nhạy cảm hơn "Sửa thành viên" thông thường nên kiểm tra rank trực
// tiếp (rankAtLeast "dept_head") thay vì chỉ dựa vào quyền module members:edit, và vẫn
// áp dụng assertScopedAccess để Trưởng phòng chỉ reset được cho thành viên trong đúng
// Trung tâm của mình (Giám đốc/Nhóm vận hành thì không bị chặn theo Trung tâm).
export async function resetMemberPassword(memberId: string, newPassword: string) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const ctx = await getUserRbacContext(userId)
  if (!rankAtLeast(ctx.rank, "dept_head")) {
    throw new Error("Không có quyền: chỉ Trưởng phòng trở lên mới được đặt lại mật khẩu")
  }
  const trimmed = (newPassword || "").trim()
  if (trimmed.length < 6) throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự")

  const member = await db.member.findUnique({ where: { id: memberId } })
  if (!member) throw new Error("Không tìm thấy thành viên")
  assertScopedAccess(ctx, "members", member)
  if (!member.email) throw new Error("Thành viên chưa có email — cần thêm email trước khi đặt lại mật khẩu")

  const passwordHash = await bcrypt.hash(trimmed, 10)
  const user = await db.user.findUnique({ where: { email: member.email } })
  if (!user) {
    throw new Error("Thành viên chưa có tài khoản đăng nhập — hãy tạo tài khoản (nhập mật khẩu) ở form Sửa thành viên trước")
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })
  await logAudit("member", "update", member.name, `Đặt lại mật khẩu đăng nhập cho “${member.name}”`)
  revalidatePath("/members")
}
