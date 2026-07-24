import { db } from "@/shared/lib/db"
import type { CustomerRow } from "./types"

export async function listCustomers(): Promise<CustomerRow[]> {
  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: {
      projects: {
        select: {
          value: true,
          tasks: { select: { status: true } },
        },
      },
    },
  })
  return customers.map((c) => {
    const projectCount = c.projects.length
    const activeProjectCount = c.projects.filter((p) => p.tasks.length > 0 && p.tasks.some((t) => t.status !== "done")).length
    const projectValueSum = c.projects.reduce((sum, p) => sum + (p.value || 0), 0)
    const displayValue = c.value && c.value > 0 ? c.value : projectValueSum
    return {
      id: c.id,
      name: c.name,
      contact: c.contact,
      email: c.email,
      phone: c.phone,
      address: c.address,
      legalRepresentative: c.legalRepresentative,
      invoicingAddress: c.invoicingAddress,
      value: c.value,
      notes: c.notes,
      projectCount,
      activeProjectCount,
      displayValue,
      createdAt: c.createdAt,
    }
  })
}
