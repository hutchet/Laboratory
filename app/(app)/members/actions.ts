"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function saveMember(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    name: String(formData.get("name") || ""),
    code: String(formData.get("code") || "") || null,
    email: String(formData.get("email") || "") || null,
    gender: String(formData.get("gender") || "") || null,
    team: String(formData.get("team") || "") || null,
    accessRole: String(formData.get("accessRole") || "viewer"),
  }
  if (id) {
    await db.member.update({ where: { id }, data })
    await logAudit("member", "update", data.name, `Cập nhật thành viên “${data.name}”`)
  } else {
    const created = await db.member.create({ data })
    await logAudit("member", "create", data.name, `Thêm thành viên mới “${data.name}” (#${created.id})`)
  }
  revalidatePath("/members")
}

export async function deleteMember(id: string) {
  const existing = await db.member.findUnique({ where: { id } })
  await db.member.delete({ where: { id } })
  await logAudit("member", "delete", existing?.name || id, `Xóa thành viên “${existing?.name || id}”`)
  revalidatePath("/members")
}
