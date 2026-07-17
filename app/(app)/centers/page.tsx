import { db } from "@/lib/db"
import CentersClient from "./CentersClient"

export default async function CentersPage() {
  const centers = await db.center.findMany({ include: { projects: { include: { customer: true } }, equipment: true } })
  const rows = centers.map((c) => ({
    id: c.id,
    name: c.name,
    manager: c.manager,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    projectCount: c.projects.length,
    equipmentValue: c.equipment.length,
    customerCount: new Set(c.projects.map((p) => p.customerId).filter(Boolean)).size,
  }))
  return <CentersClient centers={rows} />
}
