import { db } from "@/lib/db"
import ProjectsClient from "./ProjectsClient"

export default async function ProjectsPage() {
  const projects = await db.project.findMany({ include: { tasks: true }, orderBy: { createdAt: "desc" } })
  const customers = await db.customer.findMany({ select: { id: true, name: true } })
  const centers = await db.center.findMany({ select: { id: true, name: true } })
  const now = new Date()

  const rows = projects.map((p) => ({
    id: p.id,
    name: p.name,
    status: p.status,
    value: p.value,
    customerId: p.customerId,
    centerId: p.centerId,
    taskCount: p.tasks.length,
    doneCount: p.tasks.filter((t) => t.status === "done").length,
    overdueCount: p.tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "done").length,
  }))

  return <ProjectsClient projects={rows} customers={customers} centers={centers} />
}
