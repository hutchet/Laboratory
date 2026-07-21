"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can, getUserRbacContext, assertScopedAccess } from "@/shared/lib/rbac"

async function requireTasksPermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "tasks", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
  return userId
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
  const userId = await requireTasksPermission(input.id ? "edit" : "create")

  const data: Record<string, unknown> = {
    title: input.title,
    description: input.description || null,
    status: input.status || "todo",
    priority: input.priority || "med",
    assigneeId: input.assigneeId || null,
    projectId: input.projectId || null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
  }

  if (input.id) {
    const existing = await db.task.findUnique({ where: { id: input.id } })
    const ctx = await getUserRbacContext(userId)
    assertScopedAccess(ctx, "tasks", existing)
    await db.task.update({ where: { id: input.id }, data })
  } else {
    // Task moi tu dong gan centerId/groupId theo Trung tam/Nhom cua nguoi tao — de
    // Truong nhom/Ky sư/KTV thay task minh tao ngay trong pham vi Nhom (getScopeFilter).
    const ctx = await getUserRbacContext(userId)
    data.centerId = ctx.centerId ?? null
    data.groupId = ctx.groupId ?? null
    await db.task.create({ data: data as Parameters<typeof db.task.create>[0]["data"] })
  }

  revalidatePath("/tasks")
}

export async function deleteTask(id: string) {
  const userId = await requireTasksPermission("delete")
  const existing = await db.task.findUnique({ where: { id } })
  const ctx = await getUserRbacContext(userId)
  assertScopedAccess(ctx, "tasks", existing)
  await db.task.delete({ where: { id } })
  revalidatePath("/tasks")
}
