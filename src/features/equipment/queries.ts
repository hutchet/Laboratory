import { db } from "@/shared/lib/db"
import type { EquipmentRow, BookingRow, Option } from "./types"

export async function listEquipment(): Promise<EquipmentRow[]> {
  const rows = await db.equipment.findMany({ include: { center: true }, orderBy: { name: "asc" } })
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    code: e.code,
    category: e.category,
    manufacturer: e.manufacturer,
    model: e.model,
    qty: e.qty,
    status: e.status,
    room: e.room,
    centerId: e.centerId,
    hourlyRate: e.hourlyRate,
    calLast: e.calLast ? e.calLast.toISOString() : null,
    calInterval: e.calInterval,
    calCert: e.calCert,
    calVendor: e.calVendor,
    area: e.area,
    power: e.power,
    spec: e.spec,
    center: e.center ? { id: e.center.id, name: e.center.name } : null,
    createdAt: e.createdAt,
    serialNumber: e.serialNumber,
    depreciationMethod: e.depreciationMethod,
    notes: e.notes,
    monthlyDepreciationSap: e.monthlyDepreciationSap,
    costCenterCode: e.costCenterCode,
    gapCheck: e.gapCheck,
    financeCheckStatus: e.financeCheckStatus,
  }))
}

export async function listBookings(): Promise<BookingRow[]> {
  const rows = await db.equipmentBooking.findMany({
    include: { equipment: true, center: true },
    orderBy: { startTime: "desc" },
  })
  return rows.map((b) => ({
    id: b.id,
    equipmentId: b.equipmentId,
    centerId: b.centerId,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    bookedBy: b.bookedBy,
    department: b.department,
    purpose: b.purpose,
    equipment: b.equipment ? { id: b.equipment.id, name: b.equipment.name } : null,
    center: b.center ? { id: b.center.id, name: b.center.name } : null,
    createdAt: b.createdAt,
  }))
}

export async function listCenterOptions(): Promise<Option[]> {
  return db.center.findMany({ select: { id: true, name: true } })
}

export async function listEquipmentOptions(): Promise<Option[]> {
  return db.equipment.findMany({ select: { id: true, name: true } })
}
