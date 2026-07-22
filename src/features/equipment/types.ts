export type EquipmentRow = {
  id: string
  name: string
  code: string | null
  category: string | null
  manufacturer: string | null
  model: string | null
  qty: number | null
  status: string | null
  room: string | null
  area: number | null
  power: number | null
  spec: string | null
  centerId: string | null
  hourlyRate: number | null
  calLast: string | null
  calInterval: number | null
  calCert: string | null
  calVendor: string | null
  center: { id: string; name: string } | null
  createdAt: Date
}

// Ported from the original app's calStatus(e): due = calLast + calInterval*30 days.
// Both dates are normalized to midnight before diffing (matches quality/types.ts::calcCalStatus
// and the original's plDayDiff/todayStrEq2 day-boundary comparison), not a raw millisecond diff.
export type CalStatus = { due: string; state: "overdue" | "soon" | "ok" } | null
export function equipmentCalStatus(e: { calLast: string | null; calInterval: number | null }): CalStatus {
  if (!e.calLast || !e.calInterval) return null
  const last = new Date(e.calLast)
  const due = new Date(last)
  due.setDate(due.getDate() + e.calInterval * 30)
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const daysLeft = Math.round((dueMidnight.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
  const state = daysLeft < 0 ? "overdue" : daysLeft <= 30 ? "soon" : "ok"
  return { due: due.toISOString(), state }
}

export const CAL_STATUS_LABEL: Record<string, string> = {
  overdue: "Quá hạn",
  soon: "Sắp đến hạn",
  ok: "Còn hiệu lực",
}

export type BookingRow = {
  id: string
  equipmentId: string
  centerId: string | null
  startTime: string
  endTime: string
  bookedBy: string | null
  department: string | null
  purpose: string | null
  equipment: { id: string; name: string } | null
  center: { id: string; name: string } | null
  createdAt: Date
}

export type Option = { id: string; name: string }

export const EQUIPMENT_STATUS_LABEL: Record<string, string> = {
  active: "Hoạt động",
  maintenance: "Bảo trì",
  broken: "Hỏng",
  idle: "Ngừng dùng",
}
