import { db } from "@/lib/db"
import EquipmentClient from "./EquipmentClient"

export default async function EquipmentPage() {
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
      qty: e.qty, status: e.status, centerId: e.centerId, centerName: e.center?.name ?? "Chua gan",
      room: e.room, area: e.area, power: e.power, spec: e.spec,
      calLast: e.calLast ? e.calLast.toISOString() : null, calInterval: e.calInterval, calCert: e.calCert, calVendor: e.calVendor,
      calDueLabel,
    }
  })

  return <EquipmentClient equipment={rows} centers={centers} />
}
