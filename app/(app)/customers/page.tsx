import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import CustomersClient from "./CustomersClient"

export default async function CustomersPage() {
  const session = await auth()
  const userId = session?.user?.id
  const canManage = userId ? await can(userId, "customers", "edit") : false
  const customers = await db.customer.findMany({ include: { projects: true } })
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
  }))
  return <CustomersClient customers={rows} canManage={canManage} />
}
