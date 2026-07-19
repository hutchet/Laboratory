import { listTasks, listProjectOptions, listMemberOptions } from "@/features/tasks/queries"
import { TasksView } from "@/features/tasks/components/TasksView"

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, tasks, projects, members] = await Promise.all([searchParams, listTasks(), listProjectOptions(), listMemberOptions()])
  return <TasksView tasks={tasks} projects={projects} members={members} initialQuery={q || ""} />
}
