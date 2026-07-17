import { db } from "@/lib/db"
import CentersClient from "./CentersClient"

export default async function CentersPage() {
  const centers = await db.center.findMany({ include: { projects: { include: { customer: true } } } })
  const rows = centers.map((c) => {
    const projectCount = c.projects.length
    const projectValue = c.projects.reduce((s, p) => s + (p.value ?? 0), 0)
    const customerCount = new Set(c.projects.map((p) => p.customerId).filter(Boolean)).size
    return { id: c.id, name: c.name, manager: c.manager, phone: c.phone, address: c.address, notes: c.notes, projectCount, projectValue, customerCount }
  })
  return <CentersClient centers={rows} />
}
