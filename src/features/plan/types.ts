export type Option = { id: string; name: string }

export type EquipmentOption = { id: string; name: string; category: string | null; status: string | null; qty: number | null }

export type TestPackRow = {
  id: string
  testPlanId: string
  code: string
  serial: string | null
  qty: number | null
  // Khac null: goi thu nay duoc dong bo tu dong "Mau" o trang Quan ly mau -
  // khong the sua/xoa tay o trang Ke hoach, phai sua o trang Quan ly mau.
  sampleId: string | null
}

export type TestItemRow = {
  id: string
  testPlanId: string
  packId: string | null
  name: string
  reportCode: string | null
  priority: string | null
  sampleLevel: string | null
  team: string | null
  standard: string | null
  assignee: string | null
  picId: string | null
  result: string | null
  progress: number | null
  note: string | null
  sampleId: string | null
  equipmentId: string | null
  planStart: string | null
  planEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  sample: { id: string; name: string } | null
  equipment: { id: string; name: string } | null
  pic: { id: string; name: string } | null
  testPlan: { id: string; title: string | null; project: { id: string; name: string } | null } | null
}

export type TestPlanRow = {
  id: string
  projectId: string
  title: string | null
  project: { id: string; name: string } | null
}

// Auto status derived the same way as the original app (plAutoStatus):
// explicit terminal results win; otherwise derive from plan/actual dates vs today.
export function autoStatus(item: Pick<TestItemRow, "result" | "planStart" | "planEnd" | "actualStart" | "actualEnd">): string {
  if (item.result === "pass" || item.result === "fail" || item.result === "cancel") return item.result
  const today = new Date().toISOString().slice(0, 10)
  if (!item.actualStart) {
    return item.planStart && item.planStart.slice(0, 10) <= today ? "delay" : "queuing"
  }
  if (!item.actualEnd) {
    return item.planEnd && item.planEnd.slice(0, 10) < today ? "delay" : "ongoing"
  }
  return "ongoing"
}

export function isOverdue(item: Pick<TestItemRow, "result" | "planStart" | "planEnd" | "actualStart" | "actualEnd">): boolean {
  const st = autoStatus(item)
  const today = new Date().toISOString().slice(0, 10)
  return (st === "ongoing" || st === "queuing" || st === "delay") && !!item.planEnd && item.planEnd.slice(0, 10) < today && !item.actualEnd
}

export const RESULT_LABEL: Record<string, string> = {
  pass: "Đạt",
  fail: "Không đạt",
  pending: "Đang chờ",
  ongoing: "Đang thực hiện",
  queuing: "Chờ thực hiện",
  delay: "Trễ hạn",
  cancel: "Hủy",
}

// Cap do mau va Nhom phu trach - port cua PL_LEVELS/PL_TEAMS ban goc (dropdown
// trong form bai thu), luu vao TestItem.sampleLevel / TestItem.team.
export const LEVEL_OPTIONS = ["Cell", "Module", "Pack"] as const
export const TEAM_OPTIONS = ["Performance", "Safety", "Durability", "EMC", "Reliability", "DVP"] as const
export const TEAM_LABEL: Record<string, string> = {
  Performance: "Performance",
  Safety: "Safety",
  Durability: "Durability",
  EMC: "EMC",
  Reliability: "Reliability",
  DVP: "DVP",
}

export const RESULT_COLOR: Record<string, string> = {
  pass: "#2e9e5b",
  fail: "#c62828",
  ongoing: "#1d5fd6",
  queuing: "#9aa1ab",
  delay: "#e08a1e",
  cancel: "#5c5c5c",
}
