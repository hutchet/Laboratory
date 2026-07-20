// Port 1:1 tu logic tinh toan cua renderDash() va cac ham renderXxx() lien quan
// trong ban goc (taskflow_original.html dong ~4619-5170: stateOf, daysLeft,
// renderDueBars, renderDash, renderSpotlight, renderTeam, drawTeamBubbles,
// renderPvdMonthSel/renderProjValueDist, renderHeat, renderOverdue,
// renderDashProjects, drawDonut). Khong co UI filter (df-project/df-owner/
// df-range) trong ban goc thuc te render ra man hinh (khong tim thay markup
// tuong ung trong HTML) nen KHONG port lai filter toolbar do - dashFilter
// trong ban goc luon o trang thai mac dinh {project:'',owner:'',range:'all'}.

import type {
  DashBookingRaw,
  DashCustomerRaw,
  DashEquipmentRaw,
  DashMemberRaw,
  DashProjectRaw,
  DashQuoteRaw,
  DashSampleRaw,
  DashTaskRaw,
  DashTestItemRaw,
} from "./types"

const SOON_DAYS = 3

export type TaskState = "done" | "over" | "soon" | "ok" | "none"

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function daysLeft(dueDate: string | null): number | null {
  if (!dueDate) return null
  const d = new Date(dueDate.slice(0, 10) + "T00:00:00")
  return Math.round((d.getTime() - startOfToday().getTime()) / 86400000)
}

export function stateOf(t: { status: string | null; dueDate: string | null }): TaskState {
  if (t.status === "done") return "done"
  const d = daysLeft(t.dueDate)
  if (d === null) return "none"
  if (d < 0) return "over"
  if (d <= SOON_DAYS) return "soon"
  return "ok"
}

export function fmtDateVN(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso.slice(0, 10) + "T00:00:00")
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear()
}

export function fmtVND(n: number): string {
  if (n >= 1000000) return (Math.round(n / 100000) / 10).toLocaleString("vi-VN") + " Trđ"
  return Math.round(n).toLocaleString("vi-VN") + "đ"
}

export function bannerDate(): string {
  const n = new Date()
  const dn = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
  return dn[n.getDay()] + ", " + String(n.getDate()).padStart(2, "0") + "/" + String(n.getMonth() + 1).padStart(2, "0") + "/" + n.getFullYear()
}

// ---------- KPI + status bar + priority ----------

export type DashboardKpi = {
  active: number
  activeOverdueLabel: string
  util: number
  utilSub: string
  avg: string
  risk: number
}

export function computeKpi(tasks: DashTaskRaw[]): DashboardKpi {
  const total = tasks.length
  const activeN = tasks.filter((t) => t.status !== "done").length
  const activeOverdueN = tasks.filter((t) => t.status !== "done" && stateOf(t) === "over").length
  const over = tasks.filter((t) => stateOf(t) === "over").length
  const riskProjects = new Set(tasks.filter((t) => stateOf(t) === "over" && t.projectName).map((t) => t.projectName))
  const projTaskN = tasks.filter((t) => !!t.projectId).length
  const internalTaskN = total - projTaskN
  const util = total ? Math.round((projTaskN / total) * 100) : 0
  const avg = (2 + Math.round((over / Math.max(total, 1)) * 30) / 10).toFixed(1)
  return {
    active: activeN,
    activeOverdueLabel: activeOverdueN > 0 ? `${activeOverdueN} quá hạn` : "chưa hoàn thành",
    util,
    utilSub: `${internalTaskN} nội bộ phát sinh · ${projTaskN} theo dự án`,
    avg,
    risk: riskProjects.size,
  }
}

// Port kcard-trend ("so voi tuan truoc", dong ~4905-4920 ban goc): so sanh gia
// tri KPI hien tai voi gia tri se co cach 7 ngay truoc (chi tinh tren cac task
// da ton tai luc do, dua vao createdAt) - dung cho 3 the KPI hero tren Tong quan.
export type KpiTrend = { pct: number; up: boolean } | null
export type DashboardKpiTrend = { util: KpiTrend; active: KpiTrend; risk: KpiTrend }

function kpiSnapshot(tasks: DashTaskRaw[], asOfMs: number) {
  const list = tasks.filter((t) => new Date(t.createdAt).getTime() <= asOfMs)
  const total = list.length
  const activeN = list.filter((t) => t.status !== "done").length
  const riskProjects = new Set(list.filter((t) => stateOf(t) === "over" && t.projectName).map((t) => t.projectName))
  const projTaskN = list.filter((t) => !!t.projectId).length
  const util = total ? Math.round((projTaskN / total) * 100) : 0
  return { util, active: activeN, risk: riskProjects.size }
}

function pctChg(curr: number, prev: number): KpiTrend {
  if (prev === 0) return curr === 0 ? null : { pct: 100, up: true }
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (pct === 0) return { pct: 0, up: true }
  return { pct: Math.abs(pct), up: pct >= 0 }
}

export function computeKpiTrend(tasks: DashTaskRaw[]): DashboardKpiTrend {
  const now = Date.now()
  const weekAgo = now - 7 * 86400000
  const curr = kpiSnapshot(tasks, now)
  const prev = kpiSnapshot(tasks, weekAgo)
  return {
    util: pctChg(curr.util, prev.util),
    active: pctChg(curr.active, prev.active),
    risk: pctChg(curr.risk, prev.risk),
  }
}

export type StatusBar = { pr: number; pd: number; po: number; inprogN: number; doneN: number; overdueN: number; up: boolean }

export function computeStatusBar(tasks: DashTaskRaw[]): StatusBar {
  const total = tasks.length
  const done = tasks.filter((t) => t.status === "done").length
  const overdueN = tasks.filter((t) => stateOf(t) === "over").length
  const inprogN = total - done - overdueN
  const pr = total ? Math.round((inprogN / total) * 100) : 0
  const pd = total ? Math.round((done / total) * 100) : 0
  const po = total ? Math.round((overdueN / total) * 100) : 0
  return { pr, pd, po, inprogN, doneN: done, overdueN, up: pd >= po }
}

export type PriorityDonut = { high: number; med: number; low: number; highShare: number }

export function computePriority(tasks: DashTaskRaw[]): PriorityDonut {
  const high = tasks.filter((t) => t.priority === "high").length
  const med = tasks.filter((t) => t.priority === "med").length
  const low = tasks.filter((t) => t.priority === "low").length
  const total = tasks.length
  return { high, med, low, highShare: total ? Math.round((high / total) * 100) : 0 }
}

// ---------- Due bars (day / week / month) ----------

export type DueBarPoint = { label: string; count: number; isToday: boolean }

export function computeDueBars(tasks: DashTaskRaw[]): { day: DueBarPoint[]; week: DueBarPoint[]; month: DueBarPoint[] } {
  const undone = tasks.filter((t) => t.status !== "done" && t.dueDate)
  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

  const day: DueBarPoint[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const iso = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
    const cnt = undone.filter((t) => (t.dueDate as string).slice(0, 10) === iso).length
    day.push({ label: i === 0 ? "Hôm nay" : dayNames[d.getDay()], count: cnt, isToday: i === 0 })
  }

  const week: DueBarPoint[] = []
  {
    const now = new Date()
    const dow0 = now.getDay()
    const sow0 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow0)
    for (let i = 0; i < 6; i++) {
      const s = new Date(sow0.getFullYear(), sow0.getMonth(), sow0.getDate() + i * 7)
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)
      const cnt = undone.filter((t) => {
        const d = new Date((t.dueDate as string).slice(0, 10) + "T00:00:00")
        return d >= s && d < e
      }).length
      week.push({ label: i === 0 ? "Tuần này" : "Tuần " + (i + 1), count: cnt, isToday: i === 0 })
    }
  }

  const month: DueBarPoint[] = []
  {
    const now = new Date()
    for (let i = 0; i < 6; i++) {
      const s = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const e = new Date(now.getFullYear(), now.getMonth() + i + 1, 1)
      const cnt = undone.filter((t) => {
        const d = new Date((t.dueDate as string).slice(0, 10) + "T00:00:00")
        return d >= s && d < e
      }).length
      month.push({ label: i === 0 ? "Tháng này" : "Th " + (s.getMonth() + 1), count: cnt, isToday: i === 0 })
    }
  }

  return { day, week, month }
}

// ---------- Spotlight ----------

export type SpotlightData = {
  label: string
  name: string
  meta: string
  owners: { id: string; name: string }[]
  overflow: number
} | null

export function computeSpotlight(tasks: DashTaskRaw[], members: DashMemberRaw[]): SpotlightData {
  const byProject = new Map<string, DashTaskRaw[]>()
  tasks.forEach((t) => {
    if (!t.projectName) return
    const arr = byProject.get(t.projectName) || []
    arr.push(t)
    byProject.set(t.projectName, arr)
  })
  const rows = Array.from(byProject.entries())
    .map(([name, list]) => {
      const total = list.length
      const done = list.filter((t) => t.status === "done").length
      const od = list.filter((t) => stateOf(t) === "over").length
      const active = list.filter((t) => t.status !== "done").length
      const pct = total ? Math.round((done / total) * 100) : 0
      return { name, total, done, od, active, pct, tasks: list }
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => (a.od !== b.od ? b.od - a.od : b.active - a.active))
  const top = rows[0]
  if (!top) return null
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name || "?"
  const ownerIds = Array.from(new Set(top.tasks.map((t) => t.assigneeId).filter(Boolean))) as string[]
  const shown = ownerIds.slice(0, 5)
  const overflow = ownerIds.length - shown.length
  return {
    // Ban goc (id="spot-lab", dong 3166) luon hien thi nhan tinh "Dự án cần chú ý
    // nhất" bat ke du an top co qua han hay khong - KHONG doi nhan dong theo du
    // lieu (day la bug da duoc phat hien va sua: nhan tung bi doi thanh "Dự án
    // nổi bật" khi khong co qua han).
    label: "Dự án cần chú ý nhất",
    name: top.name,
    meta:
      top.od > 0
        ? `${top.od} công việc quá hạn · ${top.pct}% hoàn thành`
        : `${top.pct}% hoàn thành · ${top.active} công việc đang làm`,
    owners: shown.map((id) => ({ id, name: nameOf(id) })),
    overflow,
  }
}

// ---------- Project list ----------

export type ProjectListRow = { id: string; name: string; total: number; done: number; overdue: number; pct: number }

export function computeProjectList(tasks: DashTaskRaw[], projects: DashProjectRaw[]): ProjectListRow[] {
  return projects
    .map((p) => {
      const list = tasks.filter((t) => t.projectId === p.id)
      const total = list.length
      const done = list.filter((t) => t.status === "done").length
      const overdue = list.filter((t) => stateOf(t) === "over").length
      const pct = total ? Math.round((done / total) * 100) : 0
      return { id: p.id, name: p.name, total, done, overdue, pct }
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => (a.overdue !== b.overdue ? b.overdue - a.overdue : b.total - a.total))
}

// ---------- Team workload ----------

export type TeamRow = {
  id: string
  name: string
  role: string | null
  active: number
  done: number
  overdue: number
  itemCnt: number
  status: string
  color: string
}

export function computeTeam(
  tasks: DashTaskRaw[],
  members: DashMemberRaw[],
  testItems: DashTestItemRaw[],
): { rows: TeamRow[]; bubbles: { id: string; name: string; active: number }[]; totalActive: number } {
  const rows: TeamRow[] = members.map((m) => {
    const mine = tasks.filter((t) => t.assigneeId === m.id)
    const active = mine.filter((t) => t.status !== "done").length
    const done = mine.filter((t) => t.status === "done").length
    const od = mine.filter((t) => stateOf(t) === "over").length
    const itemCnt = testItems.filter((it) => it.picId === m.id).length
    let status: string
    let color: string
    if (od >= 3 || active >= 8) {
      status = "Quá tải"
      color = "#d9435f"
    } else if (od >= 1) {
      status = "Áp lực cao"
      color = "#e8932a"
    } else if (active >= 4) {
      status = "Cường độ cao"
      color = "#2c7be5"
    } else if (active === 0) {
      status = "Cân bằng"
      color = "#27ae84"
    } else {
      status = "Đúng tiến độ"
      color = "#27ae84"
    }
    return { id: m.id, name: m.name, role: m.role, active, done, overdue: od, itemCnt, status, color }
  })
  rows.sort((a, b) => b.active + b.itemCnt - (a.active + a.itemCnt))
  const bubbles = rows
    .slice()
    .sort((a, b) => b.active - a.active)
    .slice(0, 3)
    .map((r) => ({ id: r.id, name: r.name, active: r.active }))
  const totalActive = rows.reduce((s, r) => s + r.active, 0)
  return { rows, bubbles, totalActive }
}

// ---------- Project value distribution ----------

const PVD_PALETTE = ["#2c3652", "#9aa4b2", "#e8932a", "#27ae84", "#bf8eda", "#df84a8"]

export type PvdSegment = { name: string; value: number; pct: number; color: string }

export function computePvd(projects: DashProjectRaw[], selectedMonth: string): { segments: PvdSegment[]; total: number; topPct: number } {
  const rows = projects
    .filter((p) => !p.derivedDone && (p.value || 0) > 0 && p.endDate && p.endDate.slice(0, 7) === selectedMonth)
    .map((p) => ({ name: p.name, value: p.value || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
  const total = rows.reduce((a, r) => a + r.value, 0)
  if (!rows.length) return { segments: [], total: 0, topPct: 0 }
  const segments = rows.map((r, i) => ({
    name: r.name,
    value: r.value,
    pct: Math.round((r.value / total) * 100),
    color: PVD_PALETTE[i % PVD_PALETTE.length],
  }))
  const topPct = Math.round((rows[0].value / total) * 100)
  return { segments, total, topPct }
}

export function pvdMonthOptions(): { value: string; label: string }[] {
  const now = new Date()
  const y = now.getFullYear()
  const opts: { value: string; label: string }[] = []
  for (let m = 1; m <= 12; m++) opts.push({ value: `${y}-${String(m).padStart(2, "0")}`, label: `Tháng ${m}/${y}` })
  return opts
}

export function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

// ---------- Overdue top 3 ----------

export type OverdueRow = { id: string; title: string; project: string; ownerName: string; deadline: string | null; late: number }

export function computeOverdue(tasks: DashTaskRaw[], members: DashMemberRaw[]): OverdueRow[] {
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name || "Chưa gán"
  return tasks
    .filter((t) => stateOf(t) === "over")
    .sort((a, b) => (daysLeft(a.dueDate) || 0) - (daysLeft(b.dueDate) || 0))
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      title: t.title,
      project: t.projectName || "—",
      ownerName: nameOf(t.assigneeId),
      deadline: t.dueDate,
      late: Math.abs(daysLeft(t.dueDate) || 0),
    }))
}

// ---------- Paycards ----------

export function computePaycards1(
  samples: DashSampleRaw[],
  testItems: DashTestItemRaw[],
  customers: DashCustomerRaw[],
  quotes: DashQuoteRaw[],
) {
  const samplesTotal = samples.length
  const samplesTesting = samples.filter((s) => s.status === "testing").length
  const progresses = testItems.filter((it) => it.progress != null).map((it) => it.progress as number)
  const planProgress = progresses.length ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length) : 0
  const quoteValue = quotes.reduce((a, q) => a + (q.totalAmount || 0), 0)
  return {
    samplesTesting,
    samplesTotal,
    planProgress,
    customers: customers.length,
    quoteValueLabel: fmtVND(quoteValue),
    quoteCount: quotes.length,
  }
}

// Port 1:1 tu calStatus(e) ban goc (dong 4434) - trung logic voi
// calcCalStatus trong features/quality/types.ts. Khong import cheo feature
// (quy tac kien truc: shared -> features -> app, khong cross-feature import)
// nen lap lai ham thuan tuy nho nay tai day.
function calcCalState(calLast: string, calInterval: number): "overdue" | "soon" | "ok" {
  const lastDate = new Date(calLast)
  const due = new Date(lastDate.getTime())
  due.setDate(due.getDate() + calInterval * 30)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)
  const daysLeftN = Math.round((dueDay.getTime() - today.getTime()) / 86400000)
  return daysLeftN < 0 ? "overdue" : daysLeftN <= 30 ? "soon" : "ok"
}

export function computePaycards2(equipment: DashEquipmentRaw[]) {
  const total = equipment.length
  const ready = equipment.filter((e) => e.status === "ready").length
  let soon = 0
  let overdue = 0
  equipment.forEach((e) => {
    if (!e.calLast || !e.calInterval) return
    const state = calcCalState(e.calLast, e.calInterval)
    if (state === "soon") soon++
    if (state === "overdue") overdue++
  })
  return { total, ready, soon, calOverdue: overdue }
}

// ---------- Equipment booking heatmap ----------

const CAT_SHORT: Record<string, string> = {
  "Thiết bị đo kiểm chính": "Đo kiểm chính",
  "Thiết bị đo lường tiêu chuẩn": "Đo lường TC",
  "Thiết bị phụ trợ đo lường": "Phụ trợ",
  "Thiết bị bổ sung (đầu tư mới)": "Bổ sung mới",
  "Đã đầu tư (Component Lab/Crash P1)": "Đã đầu tư",
  "Thiết bị pin (tùy chọn)": "Thiết bị pin",
  "Quang học / màu sắc": "Quang học",
}

function catShort(c: string): string {
  return CAT_SHORT[c] || (c.length > 14 ? c.slice(0, 13) + "…" : c)
}

export type HeatRow = { label: string; count: number; pct: number }

export function computeHeat(
  equipment: DashEquipmentRaw[],
  bookings: DashBookingRaw[],
): { rows: HeatRow[]; readyPct: number; maintCount: number } {
  const catCounts = new Map<string, number>()
  equipment.forEach((e) => {
    if (e.category) catCounts.set(e.category, (catCounts.get(e.category) || 0) + 1)
  })
  const cats = Array.from(catCounts.keys())
    .sort((a, b) => (catCounts.get(b) || 0) - (catCounts.get(a) || 0))
    .slice(0, 8)
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().slice(0, 10))
  }
  const eqCategoryOf = new Map(equipment.map((e) => [e.id, e.category]))
  const totals = cats.map((cat) =>
    days.reduce(
      (sum, iso) => sum + bookings.filter((b) => eqCategoryOf.get(b.equipmentId) === cat && b.startTime.slice(0, 10) === iso).length,
      0,
    ),
  )
  const maxTotal = Math.max(1, ...totals, 0)
  const rows = cats.map((cat, i) => ({
    label: catShort(cat),
    count: totals[i],
    pct: Math.max(Math.round((totals[i] / maxTotal) * 100), totals[i] > 0 ? 4 : 0),
  }))
  const totalEq = equipment.length
  const readyEq = equipment.filter((e) => e.status === "ready").length
  const maintEq = equipment.filter((e) => e.status === "maintenance").length
  return { rows, readyPct: totalEq ? Math.round((readyEq / totalEq) * 100) : 0, maintCount: maintEq }
}

// ---------- Detail modal (openDetail port) ----------
//
// Port lai tinh than cua openDetail(type) ban goc (taskflow_original.html dong
// ~7475-7526): bam vao 1 the/card thi mo modal liet ke danh sach cong viec/du
// an/thanh vien lien quan + vai so lieu tom tat. Ban goc co ~19 type khac nhau
// trai khap nhieu trang. O day port toan bo cac type thuoc trang Tong quan
// (status, priority, kpi-active, kpi-risk, kpi-util, overdue, due-bars,
// workload, activity, dash-projects, spot-project, spot-all). Cac type con
// lai thuoc trang Projects (pk-active/pk-prog/pk-done/pk-risk) CHUA duoc port
// vi se can chuyen component modal dung chung sang shared/ui (kien truc hien
// tai: shared -> features -> app, khong cross-feature import) - xem ghi chu
// trong DashboardView.tsx.

export type DashboardDetailTaskRow = {
  kind: "task"
  id: string
  title: string
  project: string
  assigneeName: string
  deadline: string | null
}

export type DashboardDetailProjectRow = {
  kind: "project"
  id: string
  name: string
  status: string
  priority: string
  progressLabel: string
  deadline: string | null
}

export type DashboardDetailMemberRow = {
  kind: "member"
  id: string
  name: string
  color: string
  active: number
  overdue: number
  done: number
}

export type DashboardDetailRow = DashboardDetailTaskRow | DashboardDetailProjectRow | DashboardDetailMemberRow

export type DashboardDetailStat = { label: string; value: string | number }

export type DashboardDetailSection = { heading: string; color: string; rows: DashboardDetailRow[] }

// note: doan van giai thich (chi dung cho type "activity", port tu <p class=\"md-sub\"> ban goc)
export type DashboardDetail = { title: string; stats: DashboardDetailStat[]; sections: DashboardDetailSection[]; note?: string }

export type DashboardDetailType =
  | "status"
  | "priority"
  | "kpi-active"
  | "kpi-risk"
  | "kpi-util"
  | "overdue"
  | "due-bars"
  | "workload"
  | "activity"
  | "dash-projects"
  | "spot-project"
  | "spot-all"

function toDetailRow(t: DashTaskRaw, members: DashMemberRaw[]): DashboardDetailTaskRow {
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name || "Chưa gán"
  return { kind: "task", id: t.id, title: t.title, project: t.projectName || "—", assigneeName: nameOf(t.assigneeId), deadline: t.dueDate }
}

// Port 1:1 tu projStats(p) ban goc: trang thai/uu tien suy ra tu Task lien ket,
// trung logic voi features/projects/queries.ts (derivedStatus/derivedPriority)
// - khong import cheo feature nen viet lai ham thuan tuy nho nay tai day.
const PRIORITY_RANK: Record<string, number> = { high: 3, med: 2, low: 1 }

function projectDetailRow(p: DashProjectRaw, tasks: DashTaskRaw[]): DashboardDetailProjectRow {
  const ts = tasks.filter((t) => t.projectId === p.id)
  const total = ts.length
  const done = ts.filter((t) => t.status === "done").length
  const statusLabel = total === 0 ? "Chưa bắt đầu" : done === total ? "Đã hoàn thành" : "Đang thực hiện"
  const openTasks = ts.filter((t) => t.status !== "done")
  let priorityLabel = "Trung bình"
  if (openTasks.length) {
    const mx = Math.max(...openTasks.map((t) => PRIORITY_RANK[t.priority ?? "med"] ?? 0))
    priorityLabel = mx >= 3 ? "Cao" : mx === 2 ? "Trung bình" : "Thấp"
  }
  const dueDates = ts.map((t) => t.dueDate).filter((d): d is string => !!d)
  const deadline = dueDates.length ? dueDates.sort().slice(-1)[0] : null
  const pct = total ? Math.round((done / total) * 100) : 0
  return { kind: "project", id: p.id, name: p.name, status: statusLabel, priority: priorityLabel, progressLabel: `${done}/${total} (${pct}%)`, deadline }
}

export function computeDashboardDetail(
  type: DashboardDetailType,
  ctx: {
    tasks: DashTaskRaw[]
    members: DashMemberRaw[]
    projects: DashProjectRaw[]
    equipment: DashEquipmentRaw[]
    bookings: DashBookingRaw[]
  },
): DashboardDetail {
  const { tasks, members, projects, equipment, bookings } = ctx
  const toRows = (list: DashTaskRaw[]) => list.map((t) => toDetailRow(t, members))
  const total = tasks.length
  const done = tasks.filter((t) => t.status === "done")
  const over = tasks.filter((t) => stateOf(t) === "over")
  const inprog = tasks.filter((t) => t.status !== "done" && stateOf(t) !== "over")

  if (type === "status") {
    return {
      title: "Phân bố trạng thái công việc",
      stats: [
        { label: "Đang làm", value: inprog.length },
        { label: "Hoàn thành", value: done.length },
        { label: "Quá hạn", value: over.length },
      ],
      sections: [
        { heading: "Đang làm", color: "var(--neutral2)", rows: toRows(inprog) },
        { heading: "Hoàn thành", color: "var(--muted)", rows: toRows(done) },
        { heading: "Quá hạn", color: "var(--pri)", rows: toRows(over) },
      ],
    }
  }
  if (type === "priority") {
    const hi = tasks.filter((t) => t.priority === "high")
    const md = tasks.filter((t) => t.priority === "med")
    const lo = tasks.filter((t) => t.priority === "low")
    return {
      title: "Mức ưu tiên công việc",
      stats: [
        { label: "Cao", value: hi.length },
        { label: "Trung bình", value: md.length },
        { label: "Thấp", value: lo.length },
      ],
      sections: [
        { heading: "Ưu tiên cao", color: "var(--red)", rows: toRows(hi) },
        { heading: "Ưu tiên trung bình", color: "var(--amber)", rows: toRows(md) },
        { heading: "Ưu tiên thấp", color: "var(--green)", rows: toRows(lo) },
      ],
    }
  }
  if (type === "kpi-active") {
    const activeList = tasks.filter((t) => t.status !== "done")
    return {
      title: "Công việc đang hoạt động",
      stats: [
        { label: "Đang hoạt động", value: activeList.length },
        { label: "Quá hạn", value: activeList.filter((t) => stateOf(t) === "over").length },
        { label: "Tổng công việc", value: total },
      ],
      sections: [{ heading: "", color: "", rows: toRows(activeList) }],
    }
  }
  if (type === "kpi-risk") {
    const riskProjects = Array.from(new Set(over.map((t) => t.projectName).filter(Boolean)))
    const allProjects = Array.from(new Set(tasks.map((t) => t.projectName).filter(Boolean)))
    return {
      title: "Dự án có rủi ro",
      stats: [
        { label: "Dự án rủi ro", value: riskProjects.length },
        { label: "Công việc quá hạn", value: over.length },
        { label: "Tổng dự án", value: allProjects.length },
      ],
      sections: [{ heading: "Công việc quá hạn thuộc dự án rủi ro", color: "var(--red)", rows: toRows(over) }],
    }
  }
  if (type === "kpi-util") {
    const projList = tasks.filter((t) => !!t.projectId)
    const internalList = tasks.filter((t) => !t.projectId)
    const pct = total ? Math.round((projList.length / total) * 100) : 0
    return {
      title: "Dự án/nội bộ",
      stats: [
        { label: "Theo dự án", value: projList.length },
        { label: "Nội bộ phát sinh", value: internalList.length },
        { label: "Tỷ lệ theo dự án", value: `${pct}%` },
      ],
      sections: [{ heading: "", color: "", rows: toRows(internalList) }],
    }
  }
  if (type === "overdue") {
    const sorted = over.slice().sort((a, b) => (daysLeft(a.dueDate) || 0) - (daysLeft(b.dueDate) || 0))
    return {
      title: "Công việc quá hạn",
      stats: [],
      sections: [{ heading: "", color: "", rows: toRows(sorted) }],
    }
  }
  if (type === "due-bars") {
    const upcoming = tasks
      .filter((t) => t.status !== "done" && t.dueDate)
      .slice()
      .sort((a, b) => (daysLeft(a.dueDate) || 0) - (daysLeft(b.dueDate) || 0))
    const upOver = upcoming.filter((t) => stateOf(t) === "over")
    const upSoon = upcoming.filter((t) => stateOf(t) === "soon")
    return {
      title: "Công việc/hạn chốt sắp tới",
      stats: [
        { label: "Tổng chưa xong có hạn", value: upcoming.length },
        { label: "Quá hạn", value: upOver.length },
        { label: "Sắp tới", value: upSoon.length },
      ],
      sections: [{ heading: "", color: "", rows: toRows(upcoming) }],
    }
  }
  if (type === "workload") {
    const rows: DashboardDetailMemberRow[] = members.map((m) => {
      const mine = tasks.filter((t) => t.assigneeId === m.id)
      return {
        kind: "member",
        id: m.id,
        name: m.name,
        color: "var(--neutral2)",
        active: mine.filter((t) => t.status !== "done").length,
        overdue: mine.filter((t) => stateOf(t) === "over").length,
        done: mine.filter((t) => t.status === "done").length,
      }
    })
    return { title: "Khối lượng công việc", stats: [], sections: [{ heading: "", color: "", rows }] }
  }
  if (type === "activity") {
    return {
      title: "Tình trạng thiết bị (Heatmap)",
      note: "Heatmap dùng để làm gì? Mỗi ô thể hiện số lượt đặt lịch của từng nhóm thiết bị (trục dọc) theo từng ngày trong 7 ngày gần nhất (trục ngang). Ô càng đậm = nhóm thiết bị đó càng được đặt nhiều, giúp bạn nhận ra nhóm thiết bị bận nhất để sắp xếp lịch sử dụng hợp lý.",
      stats: [
        { label: "Tổng thiết bị", value: equipment.length },
        { label: "Sẵn sàng", value: equipment.filter((e) => e.status === "ready").length },
        { label: "Đang bảo trì", value: equipment.filter((e) => e.status === "maintenance").length },
      ],
      sections: [],
    }
  }
  if (type === "dash-projects") {
    return {
      title: "Dự án đang hoạt động",
      stats: [],
      sections: [{ heading: "", color: "", rows: projects.map((p) => projectDetailRow(p, tasks)) }],
    }
  }
  // spot-project | spot-all — port lai window._spotRows ban goc: nhom Task theo
  // du an, tinh done/overdue/pct, trung logic voi computeSpotlight() o tren
  // (nhung tra ve day du danh sach task de dung cho modal).
  const byProject = new Map<string, DashTaskRaw[]>()
  tasks.forEach((t) => {
    if (!t.projectName) return
    const arr = byProject.get(t.projectName) || []
    arr.push(t)
    byProject.set(t.projectName, arr)
  })
  const spotRows = Array.from(byProject.entries())
    .map(([name, list]) => {
      const listTotal = list.length
      const listDone = list.filter((t) => t.status === "done").length
      const od = list.filter((t) => stateOf(t) === "over").length
      const active = list.filter((t) => t.status !== "done").length
      const spotPct = listTotal ? Math.round((listDone / listTotal) * 100) : 0
      return { name, total: listTotal, done: listDone, od, active, pct: spotPct, tasks: list }
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => (a.od !== b.od ? b.od - a.od : b.active - a.active))

  if (type === "spot-project") {
    const top = spotRows[0]
    if (!top) return { title: "Dự án", stats: [], sections: [], note: "Không có dữ liệu dự án." }
    return {
      title: top.name,
      stats: [
        { label: "Tổng công việc", value: top.total },
        { label: "Hoàn thành", value: top.done },
        { label: "Quá hạn", value: top.od },
        { label: "Tiến độ", value: `${top.pct}%` },
      ],
      sections: [{ heading: "", color: "", rows: toRows(top.tasks) }],
    }
  }
  // spot-all
  const riskRows = spotRows.filter((r) => r.od > 0).sort((a, b) => b.od - a.od)
  if (!riskRows.length) {
    return { title: "Tất cả cảnh báo dự án", stats: [], sections: [], note: "Hiện không có dự án nào có công việc quá hạn." }
  }
  return {
    title: "Tất cả cảnh báo dự án",
    stats: [],
    sections: riskRows.map((r) => ({
      heading: `${r.name} — ${r.od} quá hạn · ${r.pct}% hoàn thành`,
      color: "var(--red)",
      rows: toRows(r.tasks.filter((t) => stateOf(t) === "over")),
    })),
  }
}
