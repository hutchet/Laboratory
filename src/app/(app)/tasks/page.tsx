import { listTasks, listProjectOptions, listMemberOptions, listTaskCenterOptions } from "@/features/tasks/queries"
import { TasksView } from "@/features/tasks/components/TasksView"

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ q }, tasks, projects, members, centers] = await Promise.all([searchParams, listTasks(), listProjectOptions(), listMemberOptions(), listTaskCenterOptions()])
  return <TasksView tasks={tasks} projects={projects} members={members} centers={centers} initialQuery={q || ""} />
}
