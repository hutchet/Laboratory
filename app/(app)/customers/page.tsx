import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import CustomersClient from "./CustomersClient"

export default async function CustomersPage() {
  const session = await auth()
  const userId = session?.user?.id
  const canManage = userId ? await can(userId, "customers", "edit") : false
  const customers = await db.customer.findMany({ include: { projects: { include: { tasks: true } } } })
  const rows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    contact: c.contact,
    email: c.email,
    phone: c.phone,
    address: c.address,
    value: c.value,
    notes: c.notes,
    projectCount: c.projects.length,
    activeProjectCount: c.projects.filter((p: any) => p.status !== 'done').length,
    totalValue: c.projects.reduce((s: number, p: any) => s + (p.value ?? 0), 0),
  }))
  return <CustomersClient customers={rows} canManage={canManage} />
}
