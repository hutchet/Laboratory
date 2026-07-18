import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import CentersClient from "./CentersClient"

export default async function CentersPage() {
  const session = await auth()
  const userId = session?.user?.id
  const canManage = userId ? await can(userId, "centers", "edit") : false
  const centers = await db.center.findMany({ include: { projects: { include: { customer: true, tasks: true } } } })
  const rows = centers.map((c) => {
    const projectCount = c.projects.length
    const projectValue = c.projects.reduce((s, p) => s + (p.value ?? 0), 0)
    const customerCount = new Set(c.projects.map((p) => p.customerId).filter(Boolean)).size
    const now2 = new Date()
    const activeProjectCount = c.projects.filter((p) => {
      const tasks = (p as any).tasks ?? []
      return tasks.some((t: any) => t.status !== "done")
    }).length
    return { id: c.id, name: c.name, manager: c.manager, phone: c.phone, address: c.address, notes: c.notes, projectCount, projectValue, customerCount, activeProjectCount }
  })
  return <CentersClient centers={rows} canManage={canManage} />
}
