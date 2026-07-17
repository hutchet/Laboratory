import { db } from "@/lib/db"
import EquipmentClient from "./EquipmentClient"
import AnalyticsClient from "./AnalyticsClient"

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab || "equipment"

  const equipment = await db.equipment.findMany({ include: { center: true } })
  const centers = await db.center.findMany({ select: { id: true, name: true } })
  const now = new Date()

  const rows = equipment.map((e) => {
    let calDueLabel = "none"
    if (e.calLast && e.calInterval) {
      const due = new Date(e.calLast)
      due.setMonth(due.getMonth() + e.calInterval)
      if (due < now) calDueLabel = "overdue"
      else if (due.getTime() - now.getTime() <= 30 * 86400000) calDueLabel = "soon"
      else calDueLabel = "ok"
    }
    return {
      id: e.id, name: e.name, code: e.code, category: e.category, manufacturer: e.manufacturer, model: e.model,
      qty: e.qty, status: e.status, centerId: e.centerId, centerName: e.center?.name ?? "Chưa gán",
      room: e.room, area: e.area, power: e.power, spec: e.spec,
      calLast: e.calLast ? e.calLast.toISOString() : null, calInterval: e.calInterval, calCert: e.calCert, calVendor: e.calVendor,
      calDueLabel,
    }
  })

  if (activeTab === "analytics") {
    const bookings = await db.equipmentBooking.findMany({ include: { equipment: true }, orderBy: { startTime: "asc" } })
    const bookingRows = bookings.map((b) => ({
      id: b.id,
      equipmentId: b.equipmentId,
      equipmentName: b.equipment.name,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      bookedBy: b.bookedBy,
      department: b.department,
      purpose: b.purpose,
    }))
    return <AnalyticsClient equipment={rows} bookings={bookingRows} />
  }

  return <EquipmentClient equipment={rows} centers={centers} />
}
