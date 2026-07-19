import { db } from "@/shared/lib/db"
import type { ProjectRow, Option } from "./types"

const PRIORITY_RANK: Record<string, number> = { high: 3, med: 2, low: 1 }

export async function listProjects(): Promise<ProjectRow[]> {
  const projects = await db.project.findMany({
    include: {
      customer: true,
      center: true,
      tasks: { select: { status: true, priority: true, dueDate: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  const now = Date.now()
  return projects.map((p) => {
    const ts = p.tasks
    const total = ts.length
    const done = ts.filter((t) => t.status === "done").length
    const overdue = ts.filter((t) => t.status !== "done" && t.dueDate && t.dueDate.getTime() < now).length
    const progress = total ? done / total : 0
    const derivedStatus: ProjectRow["derivedStatus"] = total === 0 ? "not_started" : done === total ? "done" : "doing"

    const openTasks = ts.filter((t) => t.status !== "done")
    let derivedPriority: ProjectRow["derivedPriority"] = "med"
    if (openTasks.length) {
      const mx = Math.max(...openTasks.map((t) => PRIORITY_RANK[t.priority ?? "med"] ?? 0))
      derivedPriority = mx >= 3 ? "high" : mx === 2 ? "med" : "low"
    }

    const dueDates = ts.map((t) => t.dueDate).filter((d): d is Date => !!d)
    const dueDate = dueDates.length ? new Date(Math.max(...dueDates.map((d) => d.getTime()))).toISOString() : null

    const risk = derivedStatus !== "done" && total > 0 && (overdue > 0 || progress < 0.3)

    return {
      id: p.id,
      name: p.name,
      status: p.status ?? "doing",
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      value: p.value,
      customerId: p.customerId,
      centerId: p.centerId,
      customer: p.customer ? { id: p.customer.id, name: p.customer.name } : null,
      center: p.center ? { id: p.center.id, name: p.center.name } : null,
      taskTotal: total,
      taskDone: done,
      taskOverdue: overdue,
      progress,
      derivedStatus,
      derivedPriority,
      dueDate,
      risk,
    }
  })
}

export async function listCustomerOptions(): Promise<Option[]> {
  return db.customer.findMany({ select: { id: true, name: true } })
}

export async function listCenterOptions(): Promise<Option[]> {
  return db.center.findMany({ select: { id: true, name: true } })
}
