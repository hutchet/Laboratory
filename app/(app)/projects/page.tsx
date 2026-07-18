import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import ProjectsClient from "./ProjectsClient"

export default async function ProjectsPage() {
  const session = await auth()
  const userId = session?.user?.id
  const canManage = userId ? await can(userId, "projects", "edit") : false
  const projects = await db.project.findMany({ include: { tasks: true, customer: true, center: true, plans: { include: { items: true } } }, orderBy: { createdAt: "desc" } })
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
    const plan = p.plans[0] ?? null
    const planTestCount = plan ? plan.items.length : 0
    const planStaffCount = plan ? new Set(plan.items.map((i) => i.assignee).filter(Boolean)).size : 0
    // priority: max priority of open tasks
    const ranks: Record<string, number> = { high: 3, med: 2, low: 1 }
    const openTasks = p.tasks.filter((t) => t.status !== "done")
    let priority = "Trung bình"
    if (openTasks.length) {
      const mx = Math.max(...openTasks.map((t) => ranks[t.priority ?? "med"] ?? 0))
      priority = mx >= 3 ? "Cao" : mx === 2 ? "Trung bình" : "Thấp"
    }
    // dueDate: latest deadline of tasks in this project
    const dls = p.tasks.map((t) => t.dueDate).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime())
    const dueDate = dls.length ? dls[dls.length - 1].toISOString().slice(0, 10) : null
    // owners: unique assignee IDs
    const owners = [...new Set(p.tasks.map((t) => t.assigneeId).filter((id): id is string => !!id))].slice(0, 4)
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
      hasPlan: !!plan,
      planTestCount,
      planStaffCount,
      priority,
      dueDate,
      owners,
    }
  })

  return <ProjectsClient projects={rows} customers={customers} centers={centers} canManage={canManage} />
}
