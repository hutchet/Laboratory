export type ProjectRow = {
  id: string
  name: string
  status: string | null
  startDate: string | null
  endDate: string | null
  value: number | null
  customerId: string | null
  centerId: string | null
  customer: { id: string; name: string } | null
  center: { id: string; name: string } | null
  // Derived from linked tasks (mirrors the original app's projStats()) — not manually editable.
  taskTotal: number
  taskDone: number
  taskOverdue: number
  progress: number
  derivedStatus: "not_started" | "doing" | "done"
  derivedPriority: "high" | "med" | "low"
  dueDate: string | null
  risk: boolean
}

export type Option = { id: string; name: string }

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  not_started: "Chưa bắt đầu",
  doing: "Đang thực hiện",
  done: "Đã hoàn thành",
}

export const PROJECT_PRIORITY_LABEL: Record<string, string> = {
  high: "Cao",
  med: "Trung bình",
  low: "Thấp",
}
