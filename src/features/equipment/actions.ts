"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "equipment", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

export type SaveEquipmentInput = {
  id?: string
  name: string
  code?: string | null
  category?: string | null
  manufacturer?: string | null
  model?: string | null
  qty?: number | null
  status?: string | null
  room?: string | null
  centerId?: string | null
  hourlyRate?: number | null
  calLast?: string | null
  calInterval?: number | null
  calCert?: string | null
  calVendor?: string | null
}

export async function saveEquipment(input: SaveEquipmentInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    name: input.name,
    code: input.code || null,
    category: input.category || null,
    manufacturer: input.manufacturer || null,
    model: input.model || null,
    qty: input.qty ?? null,
    status: input.status || "active",
    room: input.room || null,
    centerId: input.centerId || null,
    hourlyRate: input.hourlyRate ?? null,
    calLast: input.calLast ? new Date(input.calLast) : null,
    calInterval: input.calInterval ?? null,
    calCert: input.calCert || null,
    calVendor: input.calVendor || null,
  }
  if (input.id) {
    await db.equipment.update({ where: { id: input.id }, data })
  } else {
    await db.equipment.create({ data })
    await logAudit("equipment", "create", data.name, `Thêm thiết bị mới “${data.name}”`)
  }
  revalidatePath("/equipment")
  revalidatePath("/dash")
}

export async function deleteEquipment(id: string) {
  await requirePermission("delete")
  const existing = await db.equipment.findUnique({ where: { id } })
  await db.equipment.delete({ where: { id } })
  await logAudit("equipment", "delete", existing?.name || id, `Xoá thiết bị “${existing?.name || id}”`)
  revalidatePath("/equipment")
}

export async function bulkDeleteEquipment(ids: string[]) {
  await requirePermission("delete")
  await db.equipment.deleteMany({ where: { id: { in: ids } } })
  await logAudit("equipment", "delete", `${ids.length} thiết bị`, `Xoá hàng loạt ${ids.length} thiết bị đã chọn`)
  revalidatePath("/equipment")
}

export type SaveBookingInput = {
  id?: string
  equipmentId: string
  centerId?: string | null
  startTime: string
  endTime: string
  bookedBy?: string | null
  department?: string | null
  purpose?: string | null
}

export async function saveBooking(input: SaveBookingInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    equipmentId: input.equipmentId,
    centerId: input.centerId || null,
    startTime: new Date(input.startTime),
    endTime: new Date(input.endTime),
    bookedBy: input.bookedBy || null,
    department: input.department || null,
    purpose: input.purpose || null,
  }
  if (input.id) {
    await db.equipmentBooking.update({ where: { id: input.id }, data })
  } else {
    await db.equipmentBooking.create({ data })
    await logAudit("equipment", "create", input.equipmentId, "Thêm lịch đặt thiết bị")
  }
  revalidatePath("/equipment")
}

export async function deleteBooking(id: string) {
  await requirePermission("delete")
  await db.equipmentBooking.delete({ where: { id } })
  await logAudit("equipment", "delete", id, "Xoá lịch đặt thiết bị")
  revalidatePath("/equipment")
}
