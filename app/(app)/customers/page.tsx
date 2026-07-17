import { db } from "@/lib/db"
import CustomersClient from "./CustomersClient"

export const runtime = 'edge'

export default async function CustomersPage() {
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
  return <CustomersClient customers={rows} />
}
