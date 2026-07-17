import { db } from "@/lib/db"
import TasksClient from "./TasksClient"

export const runtime = 'edge'

export default async function TasksPage() {
  const tasks = await db.task.findMany({ include: { project: true }, orderBy: { createdAt: "desc" } })
  const projects = await db.project.findMany({ select: { id: true, name: true } })
  const members = await db.member.findMany({ select: { id: true, name: true } })

  const rows = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    assigneeId: t.assigneeId,
    projectId: t.projectId,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    project: t.project ? { id: t.project.id, name: t.project.name } : null,
  }))

  return <TasksClient tasks={rows} projects={projects} members={members} />
}
