import { db } from "@/lib/db"
import ProjectsClient from "./ProjectsClient"

export const runtime = 'edge'

export default async function ProjectsPage() {
  const projects = await db.project.findMany({ include: { tasks: true, customer: true, center: true }, orderBy: { createdAt: "desc" } })
  const customers = await db.customer.findMany({ select: { id: true, name: true } })
  const centers = await db.center.findMany({ select: { id: true, name: true } })
  const now = new Date()

  const rows = projects.map((p) => {
    const taskCount = p.tasks.length
    const doneCount = p.tasks.filter((t) => t.status === "done").length
    const overdueCount = p.tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "done").length
    let displayStatus: "doing" | "done" | "risk" = "doing"
    if (taskCount > 0 && doneCount === taskCount) displayStatus = "done"
    else if (overdueCount > 0) displayStatus = "risk"
    return {
      id: p.id,
      name: p.name,
      value: p.value,
      customerId: p.customerId,
      centerId: p.centerId,
      customerName: p.customer?.name ?? null,
      centerName: p.center?.name ?? null,
      taskCount,
      doneCount,
      overdueCount,
      displayStatus,
    }
  })

  return <ProjectsClient projects={rows} customers={customers} centers={centers} />
}
