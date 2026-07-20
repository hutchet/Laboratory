import { db } from "@/shared/lib/db"
import type { DashboardRawData } from "./types"

// Doc toan bo du lieu tho can cho renderDash() ban goc (tasks, projects,
// members, samples, equipment, quotes, customers, testItems, bookings). Tat
// ca phep tinh KPI/bieu do duoc thuc hien phia client trong compute.ts, giong
// kien truc "nap toan bo vao bo nho roi loc/tinh bang JS" cua ban goc.
export async function getDashboardRawData(): Promise<DashboardRawData> {
  const [tasks, projects, members, samples, equipment, quotes, customers, testItems, bookings] = await Promise.all([
    db.task.findMany({ include: { project: { select: { name: true } } } }),
    db.project.findMany({ include: { tasks: { select: { status: true } } } }),
    db.member.findMany(),
    db.sample.findMany({ select: { id: true, status: true } }),
    db.equipment.findMany(),
    db.quote.findMany({ select: { id: true, status: true, totalAmount: true } }),
    db.customer.findMany({ select: { id: true, name: true } }),
    db.testItem.findMany({ select: { id: true, progress: true, picId: true } }),
    db.equipmentBooking.findMany({ select: { id: true, equipmentId: true, startTime: true } }),
  ])

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      projectId: t.projectId,
      projectName: t.project?.name ?? null,
      assigneeId: t.assigneeId,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    })),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      derivedDone: p.tasks.length > 0 && p.tasks.every((t) => t.status === "done"),
      value: p.value,
      endDate: p.endDate ? p.endDate.toISOString() : null,
    })),
    members: members.map((m) => ({ id: m.id, name: m.name, role: m.role })),
    samples: samples.map((s) => ({ id: s.id, status: s.status })),
    equipment: equipment.map((e) => ({
      id: e.id,
      name: e.name,
      category: e.category,
      status: e.status,
      calLast: e.calLast ? e.calLast.toISOString() : null,
      calInterval: e.calInterval,
    })),
    quotes: quotes.map((q) => ({ id: q.id, status: q.status, totalAmount: q.totalAmount })),
    customers,
    testItems: testItems.map((it) => ({ id: it.id, progress: it.progress, picId: it.picId })),
    bookings: bookings.map((b) => ({ id: b.id, equipmentId: b.equipmentId, startTime: b.startTime.toISOString() })),
  }
}
