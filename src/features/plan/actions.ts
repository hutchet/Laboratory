"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "plan", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

async function findOrCreateTestPlan(projectId: string) {
  const existing = await db.testPlan.findFirst({ where: { projectId } })
  if (existing) return existing
  return db.testPlan.create({ data: { projectId } })
}

export type SaveTestItemInput = {
  id?: string
  projectId?: string
  testPlanId?: string
  packId?: string | null
  name: string
  reportCode?: string | null
  priority?: string | null
  standard?: string | null
  assignee?: string | null
  picId?: string | null
  result?: string | null
  progress?: number | null
  note?: string | null
  sampleId?: string | null
  equipmentId?: string | null
  planStart?: string | null
  planEnd?: string | null
  actualStart?: string | null
  actualEnd?: string | null
}

export async function saveTestItem(input: SaveTestItemInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    packId: input.packId || null,
    name: input.name,
    reportCode: input.reportCode || null,
    priority: input.priority || null,
    standard: input.standard || null,
    assignee: input.assignee || null,
    picId: input.picId || null,
    result: input.result || null,
    progress: input.progress ?? null,
    note: input.note || null,
    sampleId: input.sampleId || null,
    equipmentId: input.equipmentId || null,
    planStart: input.planStart ? new Date(input.planStart) : null,
    planEnd: input.planEnd ? new Date(input.planEnd) : null,
    actualStart: input.actualStart ? new Date(input.actualStart) : null,
    actualEnd: input.actualEnd ? new Date(input.actualEnd) : null,
  }
  if (input.id) {
    await db.testItem.update({ where: { id: input.id }, data })
  } else {
    if (!input.projectId) throw new Error("Thiếu dự án")
    const plan = await findOrCreateTestPlan(input.projectId)
    await db.testItem.create({ data: { ...data, testPlanId: plan.id } })
  }
  revalidatePath("/plan")
}

export async function deleteTestItem(id: string) {
  await requirePermission("delete")
  const item = await db.testItem.findUnique({ where: { id } })
  await db.testItem.delete({ where: { id } })
  if (item?.equipmentId) {
    // Placeholder for booking cleanup parity (equipment bookings tied to a test item
    // are removed alongside it, matching plRemoveEquipmentBooking in the original app).
  }
  revalidatePath("/plan")
}

export type SaveTestPackInput = {
  id?: string
  projectId?: string
  code: string
  serial?: string | null
  qty?: number | null
}

export async function saveTestPack(input: SaveTestPackInput) {
  await requirePermission(input.id ? "edit" : "create")
  if (input.id) {
    await db.testPack.update({ where: { id: input.id }, data: { code: input.code, serial: input.serial || null, qty: input.qty ?? 1 } })
  } else {
    if (!input.projectId) throw new Error("Thiếu dự án")
    const plan = await findOrCreateTestPlan(input.projectId)
    await db.testPack.create({ data: { testPlanId: plan.id, code: input.code, serial: input.serial || null, qty: input.qty ?? 1 } })
  }
  revalidatePath("/plan")
}

export async function deleteTestPack(id: string) {
  await requirePermission("delete")
  await db.testItem.deleteMany({ where: { packId: id } })
  await db.testPack.delete({ where: { id } })
  revalidatePath("/plan")
}

// Xoa hang loat bai thu (ban ao) - dung cho cong cu chinh sua hang loat o
// khu "Mau thu nghiem va bai thu" (chon nhieu checkbox -> 1 nut xoa).
export async function bulkDeleteTestItems(ids: string[]) {
  await requirePermission("delete")
  if (!ids.length) return
  await db.testItem.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/plan")
}
