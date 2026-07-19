"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"

async function requireTasksPermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "tasks", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

export type SaveTaskInput = {
  id?: string
  title: string
  description?: string | null
  status?: string | null
  priority?: string | null
  assigneeId?: string | null
  projectId?: string | null
  dueDate?: string | null
}

export async function saveTask(input: SaveTaskInput) {
  await requireTasksPermission(input.id ? "edit" : "create")

  const data = {
    title: input.title,
    description: input.description || null,
    status: input.status || "todo",
    priority: input.priority || "med",
    assigneeId: input.assigneeId || null,
    projectId: input.projectId || null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
  }

  if (input.id) {
    await db.task.update({ where: { id: input.id }, data })
  } else {
    await db.task.create({ data })
  }

  revalidatePath("/tasks")
}

export async function deleteTask(id: string) {
  await requireTasksPermission("delete")
  await db.task.delete({ where: { id } })
  revalidatePath("/tasks")
}
