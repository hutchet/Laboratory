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
  // Port cua projPlanStats() ban goc (dong 5154-5162): so bai thu + so nhan
  // vien cua ke hoach thu nghiem gan voi du an nay (neu co), de hien thi link
  // "Ke hoach thu nghiem" tren trang Du an.
  planStats: { hasPlan: boolean; planId: string | null; testCount: number; staffCount: number } | null
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
