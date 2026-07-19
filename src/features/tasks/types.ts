export type TaskStatus = "todo" | "doing" | "done"
export type TaskPriority = "high" | "med" | "low"

export type TaskRow = {
  id: string
  title: string
  description: string | null
  status: TaskStatus | null
  priority: TaskPriority | null
  assigneeId: string | null
  projectId: string | null
  dueDate: string | null
  project: { id: string; name: string } | null
}

export type Option = { id: string; name: string }

export const STATUS_LABEL: Record<string, string> = {
  todo: "Chưa làm",
  doing: "Đang làm",
  done: "Hoàn thành",
}

export const PRIORITY_LABEL: Record<string, string> = {
  high: "Cao",
  med: "Trung bình",
  low: "Thấp",
}
