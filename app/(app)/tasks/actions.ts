"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

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
  } else {
    await db.task.create({ data })
  }
  revalidatePath("/tasks")
  revalidatePath("/dash")
}

export async function deleteTask(id: string) {
  await db.task.delete({ where: { id } })
  revalidatePath("/tasks")
  revalidatePath("/dash")
}
