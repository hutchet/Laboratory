"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function saveTask(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    title: String(formData.get("title") || ""),
    description: String(formData.get("description") || ""),
    projectId: String(formData.get("projectId") || "") || null,
    assigneeId: String(formData.get("assigneeId") || "") || null,
    dueDate: formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null,
    priority: String(formData.get("priority") || "med"),
    status: String(formData.get("status") || "todo"),
  }
  if (id) {
    await db.task.update({ where: { id }, data })
    await logAudit("task", "update", data.title, `Cập nhật công việc “${data.title}”`)
  } else {
    const created = await db.task.create({ data })
    await logAudit("task", "create", data.title, `Thêm công việc mới “${data.title}” (#${created.id})`)
  }
  revalidatePath("/tasks")
  revalidatePath("/dash")
}

export async function deleteTask(id: string) {
  const existing = await db.task.findUnique({ where: { id } })
  await db.task.delete({ where: { id } })
  await logAudit("task", "delete", existing?.title || id, `Xóa công việc “${existing?.title || id}”`)
  revalidatePath("/tasks")
  revalidatePath("/dash")
}
