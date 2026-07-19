import { db } from "@/shared/lib/db"
import type { CenterRow } from "./types"

export async function listCenters(): Promise<CenterRow[]> {
  const centers = await db.center.findMany({
    orderBy: { name: "asc" },
    include: {
      projects: {
        select: {
          value: true,
          customerId: true,
          tasks: { select: { status: true } },
        },
      },
    },
  })
  return centers.map((c) => {
    const projectCount = c.projects.length
    const activeProjectCount = c.projects.filter((p) => p.tasks.length > 0 && p.tasks.some((t) => t.status !== "done")).length
    const customerIds = new Set(c.projects.map((p) => p.customerId).filter(Boolean))
    const totalValue = c.projects.reduce((sum, p) => sum + (p.value || 0), 0)
    return {
      id: c.id,
      name: c.name,
      address: c.address,
      manager: c.manager,
      phone: c.phone,
      notes: c.notes,
      elecPrice: c.elecPrice,
      rentPrice: c.rentPrice,
      projectCount,
      activeProjectCount,
      customerCount: customerIds.size,
      totalValue,
    }
  })
}
