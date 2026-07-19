"use server"

import { revalidatePath } from "next/cache"
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

export type SaveMemberInput = {
  id?: string
  name: string
  code?: string | null
  email?: string | null
  gender?: string | null
  team?: string | null
  accessRole?: string | null
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
  revalidatePath("/members")
}

export async function deleteMember(id: string) {
  await requirePermission("delete")
  const existing = await db.member.findUnique({ where: { id } })
  await db.member.delete({ where: { id } })
  await logAudit("member", "delete", existing?.name || id, `Xoá thành viên “${existing?.name || id}”`)
  revalidatePath("/members")
}
