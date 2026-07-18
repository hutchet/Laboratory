"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function saveProject(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    name: String(formData.get("name") || ""),
    status: String(formData.get("status") || "doing"),
    customerId: String(formData.get("customerId") || "") || null,
    centerId: String(formData.get("centerId") || "") || null,
    value: formData.get("value") ? Number(formData.get("value")) : null,
    startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : null,
    endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
  }
  if (id) {
    await db.project.update({ where: { id }, data })
    await logAudit("project", "update", data.name, `Cập nhật dự án “${data.name}”`)
  } else {
    const created = await db.project.create({ data })
    await logAudit("project", "create", data.name, `Thêm dự án mới “${data.name}” (#${created.id})`)
  }
  revalidatePath("/projects")
  revalidatePath("/dash")
}

export async function deleteProject(id: string) {
  const existing = await db.project.findUnique({ where: { id } })
  await db.project.delete({ where: { id } })
  await logAudit("project", "delete", existing?.name || id, `Xóa dự án “${existing?.name || id}”`)
  revalidatePath("/projects")
  revalidatePath("/dash")
}
