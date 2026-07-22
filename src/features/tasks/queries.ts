import { db } from "@/shared/lib/db"
import { auth } from "@/shared/lib/auth"
import { getUserRbacContext, getScopeFilter } from "@/shared/lib/rbac"
import type { TaskRow, Option } from "./types"

// Phan vung theo Trung tam/Nhom van hanh: Task co ca centerId va groupId nen dung
// getScopeFilter (Truong nhom/Ky su/KTV chi thay task cua Nhom minh; Truong phong thay
// toan bo Trung tam; Giam doc/Nhom van hanh thay toan bo).
export async function listTasks(): Promise<TaskRow[]> {
  const session = await auth()
  const ctx = session?.user?.id ? await getUserRbacContext(session.user.id) : null
  const scopeFilter = ctx ? getScopeFilter(ctx, "tasks") : {}
  const tasks = await db.task.findMany({ where: scopeFilter, include: { project: true }, orderBy: { createdAt: "desc" } })
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: (t.status as TaskRow["status"]) ?? "todo",
    priority: (t.priority as TaskRow["priority"]) ?? "med",
    assigneeId: t.assigneeId,
    projectId: t.projectId,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    project: t.project ? { id: t.project.id, name: t.project.name } : null,
    centerId: t.centerId,
    center: null,
    createdAt: t.createdAt.toISOString(),
  }))
}

export async function listProjectOptions(): Promise<Option[]> {
  return db.project.findMany({ select: { id: true, name: true } })
}

export async function listMemberOptions(): Promise<Option[]> {
  return db.member.findMany({ select: { id: true, name: true } })
}

// Danh sách trung tâm dùng cho trang "Danh sách trung tâm" (hub-card) của module Công việc —
// mô hình giống trang Trung tâm: mỗi thẻ trung tâm dẫn vào danh sách công việc riêng của
// nhân viên thuộc trung tâm đó.
export async function listTaskCenterOptions(): Promise<import("./types").CenterOption[]> {
  return db.center.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
}

export type OverdueTaskNotif = {
  id: string
  title: string
  projectName: string | null
  assigneeName: string | null
  daysLate: number
}

// Ported from stateOf()/daysLeft() in the original app (dòng 4619-4620): một task "quá hạn"
// là task chưa done và có hạn chốt đã qua ngày hôm nay. Dùng cho chuông thông báo top bar.
export async function listOverdueTasksForNotif(): Promise<OverdueTaskNotif[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [tasks, members] = await Promise.all([
    db.task.findMany({
      where: { status: { not: "done" }, dueDate: { lt: today } },
      include: { project: true },
      orderBy: { dueDate: "asc" },
    }),
    db.member.findMany({ select: { id: true, name: true } }),
  ])
  const memberName = (id: string | null) => (id ? members.find((m) => m.id === id)?.name ?? null : null)
  return tasks.map((t) => {
    const due = t.dueDate ? new Date(t.dueDate) : null
    const daysLate = due ? Math.round((today.getTime() - due.getTime()) / 86400000) : 0
    return {
      id: t.id,
      title: t.title,
      projectName: t.project?.name ?? null,
      assigneeName: memberName(t.assigneeId),
      daysLate,
    }
  })
}
