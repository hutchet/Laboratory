export type AuditPlanRow = {
  id: string
  title: string
  scheduledAt: string | null
  status: string | null
  itemCount: number
  phaseCount: number
}

export type AuditPhaseRow = { id: string; auditPlanId: string; name: string; order: number | null }

export type AuditItemRow = {
  id: string
  auditPlanId: string
  phaseId: string | null
  name: string
  assignee: string | null
  status: string | null
  planStart: string | null
  planEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  note: string | null
  createdAt: string
  phase: { id: string; name: string; order: number | null } | null
  auditPlan: { id: string; title: string } | null
}

export const AUDIT_STATUS_LABEL: Record<string, string> = {
  planned: "Đã lập kế hoạch",
  in_progress: "Đang thực hiện",
  done: "Hoàn thành",
  overdue: "Quá hạn",
  doing: "Đang triển khai",
  todo: "Chưa bắt đầu",
}

// Faithful port of apStatus(t) from the original app: aend present => done;
// planEnd in the past with no actual end => overdue; planStart<=today<=planEnd => doing; else todo.
export function auditAutoStatus(it: Pick<AuditItemRow, "planStart" | "planEnd" | "actualEnd">): "done" | "overdue" | "doing" | "todo" {
  const today = new Date().toISOString().slice(0, 10)
  if (it.actualEnd) return "done"
  const end = it.planEnd ? it.planEnd.slice(0, 10) : null
  const start = it.planStart ? it.planStart.slice(0, 10) : null
  if (end && end < today) return "overdue"
  if (start && start <= today && (!end || end >= today)) return "doing"
  return "todo"
}

// Matches AP_STATUS_COLOR (var(--green)/var(--red)/var(--amber)/var(--pri)).
export const AUDIT_STATUS_COLOR: Record<string, string> = {
  done: "#2e9e5b",
  overdue: "#c62828",
  doing: "#e08a1e",
  todo: "#1d5fd6",
}
