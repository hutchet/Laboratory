"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { AddButton } from "@/shared/ui/add-button"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { KpiCard } from "@/shared/ui/kpi-card"
import { DonutSvg } from "@/shared/ui/donut-svg"
import { DateField } from "@/shared/ui/date-field"
import { IconButton } from "@/shared/ui/icon-button"
import { PlainSelect } from "@/shared/ui/plain-select"
import { GanttChart } from "./GanttChart"
import { PlanCard } from "./PlanCard"
import { Perm } from "@/shared/lib/rbac-client"
import { saveTestItem, deleteTestItem, saveTestPack, deleteTestPack, bulkDeleteTestItems } from "../actions"
import { RESULT_LABEL, RESULT_COLOR, LEVEL_OPTIONS, TEAM_OPTIONS, TEAM_LABEL, autoStatus, isOverdue, type TestItemRow, type TestPackRow, type TestPlanRow, type Option } from "../types"

// Port cua renderPlanOverview() ban goc (dong 7022-7043): 2 donut rieng
// (theo trang thai tu dong: ongoing/queuing/delay/cancel, va theo ket qua
// tuong minh: pass/fail).
const PLAN_STATUS_DONUT_KEYS = ["ongoing", "queuing", "delay", "cancel"] as const
const PLAN_RESULT_DONUT_KEYS = ["pass", "fail"] as const

// Port cua downloadCsv() dung o AuditPlanView/TasksView/PurchaseView (nut
// "Xuat Excel" ban goc thuc chat la xuat .csv qua Blob, giu dung ky thuat).
function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function PlanView({
  items, packs, plans, projects, samples, equipmentOptions, memberOptions, initialProjectFilter,
}: {
  items: TestItemRow[]; packs: TestPackRow[]; plans: TestPlanRow[]; projects: Option[]; samples: Option[]; equipmentOptions: Option[]; memberOptions: Option[]; initialProjectFilter?: string
}) {
  // Port cua data-goto-plan ban goc (dong 6493-6495): cho phep nhay toi day
  // tu trang Du an da loc san theo ?project=<id>.
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter || "")
  const [editing, setEditing] = useState<TestItemRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showPackForm, setShowPackForm] = useState(false)
  const [editingPack, setEditingPack] = useState<TestPackRow | null>(null)
  const [newItemPackId, setNewItemPackId] = useState<string>("")
  const [confirmDeletePackId, setConfirmDeletePackId] = useState<string | null>(null)
  // Ban ao: bo cong cu chinh sua hang loat bai thu trong khu "Mau thu nghiem
  // va bai thu" - bat/tat bang nut "Chinh sua"/"Xong", chon nhieu qua
  // checkbox roi xoa 1 lan qua bulkDeleteTestItems.
  const [editMode, setEditMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)
  const [pending, startTransition] = useTransition()

  // Ban ao: cac state "preview" cho form bai thu - dung de tinh truc tiep
  // "Thoi luong thuc te" / "Ket thuc du kien" va canh bao trung lich (seqWarning)
  // ngay trong luc dien form, truoc khi bam Luu.
  const [tiPackId, setTiPackId] = useState("")
  const [tiPlanStart, setTiPlanStart] = useState("")
  const [tiPlanEnd, setTiPlanEnd] = useState("")
  const [tiActualStart, setTiActualStart] = useState("")
  const [tiActualEnd, setTiActualEnd] = useState("")
  useEffect(() => {
    if (!showForm) return
    setTiPackId(editing?.packId ?? newItemPackId ?? "")
    setTiPlanStart(editing?.planStart ? editing.planStart.slice(0, 10) : "")
    setTiPlanEnd(editing?.planEnd ? editing.planEnd.slice(0, 10) : "")
    setTiActualStart(editing?.actualStart ? editing.actualStart.slice(0, 10) : "")
    setTiActualEnd(editing?.actualEnd ? editing.actualEnd.slice(0, 10) : "")
  }, [showForm, editing, newItemPackId])
  const tiDurationDays = useMemo(() => {
    if (!tiActualStart || !tiActualEnd) return null
    const ms = new Date(tiActualEnd).getTime() - new Date(tiActualStart).getTime()
    if (Number.isNaN(ms)) return null
    return Math.max(0, Math.round(ms / 86400000))
  }, [tiActualStart, tiActualEnd])
  const tiExpectedEnd = useMemo(() => {
    if (!tiActualStart || tiActualEnd || !tiPlanStart || !tiPlanEnd) return null
    const planMs = new Date(tiPlanEnd).getTime() - new Date(tiPlanStart).getTime()
    if (Number.isNaN(planMs) || planMs < 0) return null
    return new Date(new Date(tiActualStart).getTime() + planMs).toISOString().slice(0, 10)
  }, [tiActualStart, tiActualEnd, tiPlanStart, tiPlanEnd])
  const seqWarning = useMemo(() => {
    if (!tiPackId || !tiPlanStart) return null
    const end = tiPlanEnd || tiPlanStart
    const overlap = items.some((it) => {
      if (it.packId !== tiPackId || it.id === editing?.id) return false
      const sStart = it.planStart ? it.planStart.slice(0, 10) : null
      if (!sStart) return false
      const sEnd = it.planEnd ? it.planEnd.slice(0, 10) : sStart
      return sStart <= end && tiPlanStart <= sEnd
    })
    return overlap ? "Trùng lịch với bài thử khác trong cùng mẩu — các bài thử trong 1 mẩu nên chạy tuần tự, không nên chồng lịch." : null
  }, [items, tiPackId, tiPlanStart, tiPlanEnd, editing])

  const scopedItems = useMemo(
    () => items.filter((it) => !projectFilter || it.testPlan?.project?.id === projectFilter),
    [items, projectFilter],
  )
  const scopedPacks = useMemo(() => {
    const planIds = new Set(plans.filter((p) => !projectFilter || p.projectId === projectFilter).map((p) => p.id))
    return packs.filter((p) => planIds.has(p.testPlanId))
  }, [packs, plans, projectFilter])

  // Ban ao: trang danh sach dang the (card) theo du an - hien khi CHUA chon
  // 1 du an cu the (projectFilter rong). Moi the: ten du an, tieu de ke
  // hoach (neu co), so mau/bai thu/dat, tien do trung binh; bam vao the de
  // vao dung Ke hoach thu nghiem cua du an do (projectFilter = project.id).
  const projectCards = useMemo(() => {
    return projects.map((p) => {
      const plan = plans.find((pl) => pl.projectId === p.id)
      const projItems = items.filter((it) => it.testPlan?.project?.id === p.id)
      const projPacks = plan ? packs.filter((pk) => pk.testPlanId === plan.id) : []
      const passCount = projItems.filter((it) => it.result === "pass").length
      const doneCount = projItems.filter((it) => it.result === "pass" || it.result === "fail" || it.result === "cancel").length
      const avgProgress = projItems.length ? Math.round(projItems.reduce((s, it) => s + (it.progress || 0), 0) / projItems.length) : 0
      // Port 1:1 cua bien `status` trong renderPlanCardOverview() ban goc (dong 7218).
      const status = plan ? (doneCount === projItems.length && projItems.length ? "Hoàn thành" : "Đang triển khai") : "Chưa có kế hoạch"
      return { project: p, status, packCount: projPacks.length, itemCount: projItems.length, passCount, doneCount, avgProgress }
    })
  }, [projects, plans, packs, items])

  // Port cua #page-title.title-back ban goc (dong 6458, 7228-7230; CSS globals.css
  // ~dong 840): khi da chon 1 du an cu the, tieu de trang tren topbar (id="page-title",
  // xem app/(app)/layout.tsx) tro thanh nut "back" - bam vao tieu de la ve lai danh
  // sach the ke hoach theo du an. KHONG dung nut "Danh sach ke hoach" rieng va KHONG
  // dung droplist chon du an (ban goc cung khong co - #plan-project-select la select
  // an, chi dung noi bo).
  useEffect(() => {
    const el = document.getElementById("page-title")
    if (!el) return
    if (projectFilter) {
      el.classList.add("title-back")
      el.title = "Quay lại danh sách dự án"
      const handler = () => setProjectFilter("")
      el.addEventListener("click", handler)
      return () => {
        el.classList.remove("title-back")
        el.removeAttribute("title")
        el.removeEventListener("click", handler)
      }
    }
    el.classList.remove("title-back")
    el.removeAttribute("title")
  }, [projectFilter])

  // Overview KPIs (mirrors renderPlanOverview: totals, avg progress, status breakdown, overdue count).
  const kpi = useMemo(() => {
    const total = scopedItems.length
    const pass = scopedItems.filter((it) => it.result === "pass").length
    const fail = scopedItems.filter((it) => it.result === "fail").length
    const ongoing = scopedItems.filter((it) => autoStatus(it) === "ongoing").length
    const overdue = scopedItems.filter((it) => isOverdue(it)).length
    const avgProgress = total ? Math.round(scopedItems.reduce((s, it) => s + (it.progress || 0), 0) / total) : 0
    const byStatus: Record<string, number> = {}
    scopedItems.forEach((it) => { const s = autoStatus(it); byStatus[s] = (byStatus[s] || 0) + 1 })
    return { total, pass, fail, ongoing, overdue, avgProgress, byStatus }
  }, [scopedItems])

  const statusDonutSegments = useMemo(
    () => PLAN_STATUS_DONUT_KEYS.map((k) => ({ value: kpi.byStatus[k] || 0, color: RESULT_COLOR[k] })).filter((s) => s.value > 0),
    [kpi.byStatus],
  )
  const resultDonutSegments = useMemo(
    () => PLAN_RESULT_DONUT_KEYS.map((k) => ({ value: kpi.byStatus[k] || 0, color: RESULT_COLOR[k] })).filter((s) => s.value > 0),
    [kpi.byStatus],
  )

  // Khoi luong theo nguoi phu trach - port cua #plan-pic-workload ban goc
  // (.pl-hbar-row, sap xep giam dan theo so bai).
  const workload = useMemo(() => {
    const map = new Map<string, number>()
    scopedItems.forEach((it) => {
      const key = it.pic?.name || it.assignee || "Chưa gán"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [scopedItems])
  const maxWorkload = Math.max(1, ...workload.map(([, n]) => n))

  // Ty le hoan thanh theo muc do uu tien - cung ky thuat .pl-hbar-row nhu
  // khoi luong theo PIC, nhom theo gia tri priority thuc te cua bai thu.
  const priorityStats = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>()
    scopedItems.forEach((it) => {
      const key = it.priority || "Chưa gán"
      const cur = map.get(key) || { done: 0, total: 0 }
      cur.total++
      if (it.result === "pass") cur.done++
      map.set(key, cur)
    })
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total)
  }, [scopedItems])

  function exportCsv() {
    const header = ["Bài thử", "Dự án", "Mẫu", "Tiêu chuẩn", "Phụ trách", "KH bắt đầu", "KH kết thúc", "TT bắt đầu", "TT kết thúc", "Tiến độ", "Kết quả"]
    const rows = scopedItems.map((it) => [
      it.name,
      it.testPlan?.project?.name ?? "",
      packs.find((p) => p.id === it.packId)?.code ?? "",
      it.standard ?? "",
      it.pic?.name ?? it.assignee ?? "",
      it.planStart ? it.planStart.slice(0, 10) : "",
      it.planEnd ? it.planEnd.slice(0, 10) : "",
      it.actualStart ? it.actualStart.slice(0, 10) : "",
      it.actualEnd ? it.actualEnd.slice(0, 10) : "",
      it.progress != null ? `${it.progress}%` : "",
      RESULT_LABEL[autoStatus(it)] ?? "",
    ])
    downloadCsv("ke-hoach-thu-nghiem.csv", [header, ...rows])
  }

  function openNew() { setEditing(null); setNewItemPackId(""); setShowForm(true) }
  function openEdit(it: TestItemRow) { setEditing(it); setShowForm(true) }
  function openNewItemForPack(packId: string) { setEditing(null); setNewItemPackId(packId); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      projectId: String(formData.get("projectId") || "") || undefined,
      packId: String(formData.get("packId") || "") || null,
      name: String(formData.get("name") || ""),
      reportCode: String(formData.get("reportCode") || ""),
      priority: String(formData.get("priority") || ""),
      sampleLevel: String(formData.get("sampleLevel") || ""),
      team: String(formData.get("team") || ""),
      standard: String(formData.get("standard") || ""),
      picId: String(formData.get("picId") || "") || null,
      result: String(formData.get("result") || ""),
      progress: formData.get("progress") ? Number(formData.get("progress")) : null,
      sampleId: String(formData.get("sampleId") || "") || null,
      equipmentId: String(formData.get("equipmentId") || "") || null,
      planStart: String(formData.get("planStart") || "") || null,
      planEnd: String(formData.get("planEnd") || "") || null,
      actualStart: String(formData.get("actualStart") || "") || null,
      actualEnd: String(formData.get("actualEnd") || "") || null,
      note: String(formData.get("note") || ""),
    }
    startTransition(async () => { await saveTestItem(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteTestItem(id); setConfirmDeleteId(null) })
  }
  function openNewPack() { setEditingPack(null); setShowPackForm(true) }
  function openEditPack(p: TestPackRow) { setEditingPack(p); setShowPackForm(true) }
  function handlePackSubmit(formData: FormData) {
    const input = {
      id: editingPack?.id,
      projectId: String(formData.get("projectId") || "") || undefined,
      code: String(formData.get("code") || ""),
      serial: String(formData.get("serial") || "") || null,
      qty: formData.get("qty") ? Number(formData.get("qty")) : 1,
    }
    startTransition(async () => { await saveTestPack(input); setShowPackForm(false); setEditingPack(null) })
  }
  function confirmDeletePack() {
    if (!confirmDeletePackId) return
    const id = confirmDeletePackId
    startTransition(async () => { await deleteTestPack(id); setConfirmDeletePackId(null) })
  }

  // Ban ao: chon/bo chon 1 bai thu, chon tat ca, va xoa hang loat cac bai da
  // chon (dung chung 1 confirm dialog cho toan bo khu vuc dang loc).
  function toggleSelectItem(id: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    setSelectedItems((prev) => (prev.size === scopedItems.length ? new Set() : new Set(scopedItems.map((it) => it.id))))
  }
  function confirmBulkDeleteItems() {
    const ids = Array.from(selectedItems)
    startTransition(async () => {
      await bulkDeleteTestItems(ids)
      setSelectedItems(new Set())
      setConfirmBulkDelete(false)
    })
  }

  const unassignedItems = useMemo(() => scopedItems.filter((it) => !it.packId), [scopedItems])

  return (
    <PageShell title="Kế hoạch thử nghiệm">
      {!projectFilter ? (
        /* Port 1:1 cua #plan-card-overview ban goc (dong 3746; CSS dong 848): luoi the
           tom tat ke hoach theo tung du an - giu dung id de dung grid CSS
           "repeat(auto-fit,minmax(300px,1fr))" (KHAC .proj-grid) - bam vao 1 the de vao
           dung ke hoach cua du an do. */
        <div id="plan-card-overview">
          {projectCards.map(({ project, status, packCount, itemCount, passCount, doneCount, avgProgress }) => (
            <PlanCard
              key={project.id}
              projectName={project.name}
              status={status}
              packCount={packCount}
              itemCount={itemCount}
              passCount={passCount}
              doneCount={doneCount}
              avgProgress={avgProgress}
              onClick={() => setProjectFilter(project.id)}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="kpis-tier" style={{ marginBottom: 18 }}>
            <KpiCard label="Tổng bài thử" value={kpi.total} hint="Trong kế hoạch" tone="neutral" />
            <KpiCard label="Đạt" value={kpi.pass} hint="Số bài đạt" tone="success" />
            <KpiCard label="Không đạt" value={kpi.fail} hint="Số bài không đạt" tone="danger" />
            <KpiCard label="Đang thực hiện" value={kpi.ongoing} hint="Đang triển khai" tone="warning" />
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="ch">
              <h3>Tổng quan tiến độ &amp; kết quả</h3>
              <span>Toàn bộ kế hoạch trong phạm vi đang lọc</span>
            </div>
            {scopedItems.length === 0 ? (
              <div className="empty">Chưa có bài thử nào trong phạm vi này.</div>
            ) : (
              <div className="pl-donut-wrap pl-overview-row">
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>Theo trạng thái</div>
                  <div className="pl-donut-inline">
                    <DonutSvg size={110} segments={statusDonutSegments} />
                    <div className="pl-legend-side">
                      {PLAN_STATUS_DONUT_KEYS.map((k) => (
                        <div key={k} className="li"><span className="dot" style={{ background: RESULT_COLOR[k] }} />{RESULT_LABEL[k]}: <b>{kpi.byStatus[k] || 0}</b></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>Tỷ lệ đạt / không đạt</div>
                  <div className="pl-donut-inline">
                    <DonutSvg size={110} segments={resultDonutSegments} />
                    <div className="pl-legend-side">
                      {PLAN_RESULT_DONUT_KEYS.map((k) => (
                        <div key={k} className="li"><span className="dot" style={{ background: RESULT_COLOR[k] }} />{RESULT_LABEL[k]}: <b>{kpi.byStatus[k] || 0}</b></div>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Tiến độ trung bình</div>
                  <div className="pctbig">{kpi.avgProgress}%</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginTop: 14, marginBottom: 6 }}>Quá hạn kế hoạch</div>
                  <div className="pctbig" style={{ fontSize: 22, color: "var(--red)" }}>{kpi.overdue} bài</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Khối lượng theo người phụ trách</div>
                  {workload.length === 0 ? <div className="pl-mini-row">Chưa gán người phụ trách.</div> : workload.map(([name, count]) => (
                    <div key={name} className="pl-hbar-row">
                      <span className="pl-hbar-label" title={name}>{name}</span>
                      <div className="pl-hbar-track"><div className="pl-hbar-fill" style={{ width: `${Math.round((count / maxWorkload) * 100)}%`, background: "var(--pri)" }} /></div>
                      <span className="pl-hbar-val">{count}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Tiến độ theo mẫu</div>
                  {scopedPacks.length === 0 ? <div className="pl-mini-row">Chưa có mẫu.</div> : (
                    <div className="pl-pack-tiles">
                      {scopedPacks.map((p) => {
                        const its = scopedItems.filter((it) => it.packId === p.id)
                        const done = its.filter((it) => it.result === "pass").length
                        const pct = its.length ? Math.round((done / its.length) * 100) : 0
                        const bg = pct >= 100 ? "var(--green)" : pct > 0 ? "#4f6cf7" : "var(--muted)"
                        return (
                          <div key={p.id} className="pl-pack-tile" style={{ background: bg }} title={`Mẫu ${p.code}: ${done}/${its.length} đạt`}>
                            <div>{p.code}</div>
                            <div className="pct">{pct}%</div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 8 }}>Tỷ lệ hoàn thành theo mức độ ưu tiên</div>
                  {priorityStats.length === 0 ? <div className="pl-mini-row">Chưa có dữ liệu.</div> : priorityStats.map(([label, s]) => (
                    <div key={label} className="pl-hbar-row">
                      <span className="pl-hbar-label" title={label}>{label}</span>
                      <div className="pl-hbar-track"><div className="pl-hbar-fill" style={{ width: `${s.total ? Math.round((s.done / s.total) * 100) : 0}%`, background: "var(--pri)" }} /></div>
                      <span className="pl-hbar-val">{s.done}/{s.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <GanttChart
              items={scopedItems}
              packs={scopedPacks}
              onEditItem={openEdit}
              title="Sơ đồ Gantt kế hoạch thử nghiệm"
              subtitle="Mỗi mẫu chạy một chuỗi bài thử tuần tự riêng"
            />
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="ch">
              <h3>Mẫu thử nghiệm và bài thử</h3>
              <span>{scopedPacks.length} mẫu</span>
            </div>
            <Perm minPerm="dept_head">
              <div className="pl-toolbar">
                <AddButton label="Thêm mẫu" onClick={openNewPack} />
                <button type="button" className="btn-line" onClick={openNew}>+ Bài test chưa gán mẫu</button>
                <button
                  type="button"
                  className="btn-line"
                  onClick={() => { setEditMode((v) => !v); setSelectedItems(new Set()) }}
                >
                  {editMode ? "Xong" : "Chỉnh sửa"}
                </button>
                {editMode && (
                  <>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
                      <input
                        type="checkbox"
                        checked={scopedItems.length > 0 && selectedItems.size === scopedItems.length}
                        onChange={toggleSelectAll}
                      />
                      Chọn tất cả ({scopedItems.length})
                    </label>
                    <button
                      type="button"
                      className="btn-line"
                      style={{ color: "var(--red)", borderColor: "var(--red)" }}
                      disabled={selectedItems.size === 0}
                      onClick={() => setConfirmBulkDelete(true)}
                    >
                      Xoá đã chọn ({selectedItems.size})
                    </button>
                  </>
                )}
              </div>
            </Perm>
            {scopedPacks.length === 0 && unassignedItems.length === 0 ? (
              <div className="empty">Chưa có mẫu nào. Bấm &quot;+ Thêm mẫu&quot; để tạo mẫu đầu tiên.</div>
            ) : (
              <>
                {scopedPacks.map((p) => {
                  const packItems = scopedItems.filter((it) => it.packId === p.id)
                  const done = packItems.filter((it) => it.result === "pass").length
                  return (
                    <div key={p.id} className="pl-pack-card">
                      <div className="ph">
                        <b>Mẫu {p.code}</b>
                        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>S/N: {p.serial || "—"} · SL: {p.qty ?? 1}</span>
                        {p.sampleId && <StatusBadge label="Đồng bộ từ Mẫu" tone="info" />}
                        <span style={{ flex: 1 }} />
                        <StatusBadge label={`${done}/${packItems.length} đạt`} tone={done >= packItems.length && packItems.length > 0 ? "success" : "neutral"} />
                        <Perm minPerm="technician">
                          <button type="button" className="btn-line" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => openNewItemForPack(p.id)}>+ Bài test</button>
                        </Perm>
                        {!p.sampleId && (
                          <Perm minPerm="dept_head">
                            <button type="button" className="txt-act" onClick={() => openEditPack(p)}>Sửa mẫu</button>
                            <button type="button" className="txt-act del" onClick={() => setConfirmDeletePackId(p.id)}>Xóa mẫu</button>
                          </Perm>
                        )}
                      </div>
                      {editMode && (
                        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                          {packItems.length === 0 ? (
                            <div className="pl-mini-row">Chưa có bài thử trong mẫu này.</div>
                          ) : packItems.map((it) => (
                            <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 8, background: "var(--surface-control)" }}>
                              <input type="checkbox" checked={selectedItems.has(it.id)} onChange={() => toggleSelectItem(it.id)} />
                              <span style={{ flex: 1, fontSize: 12.5 }}>{it.name}</span>
                              <StatusBadge label={RESULT_LABEL[autoStatus(it)] ?? ""} tone={it.result === "pass" ? "success" : it.result === "fail" ? "danger" : "neutral"} />
                              <IconButton icon="edit" title="Sửa" onClick={() => openEdit(it)} size={28} />
                              <IconButton icon="delete" title="Xoá" variant="danger" onClick={() => setConfirmDeleteId(it.id)} size={28} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {unassignedItems.length > 0 && (
                  <div className="pl-pack-card">
                    <div className="ph">
                      <b>Bài thử chưa gán mẫu</b>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{unassignedItems.length} bài</span>
                    </div>
                    {editMode && (
                      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                        {unassignedItems.map((it) => (
                          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", borderRadius: 8, background: "var(--surface-control)" }}>
                            <input type="checkbox" checked={selectedItems.has(it.id)} onChange={() => toggleSelectItem(it.id)} />
                            <span style={{ flex: 1, fontSize: 12.5 }}>{it.name}</span>
                            <StatusBadge label={RESULT_LABEL[autoStatus(it)] ?? ""} tone={it.result === "pass" ? "success" : it.result === "fail" ? "danger" : "neutral"} />
                            <IconButton icon="edit" title="Sửa" onClick={() => openEdit(it)} size={28} />
                            <IconButton icon="delete" title="Xoá" variant="danger" onClick={() => setConfirmDeleteId(it.id)} size={28} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="card">
            <div className="ch">
              <h3>Xuất báo cáo kế hoạch</h3>
              <span>Tải danh sách bài thử chi tiết trong phạm vi đang lọc</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-line" onClick={exportCsv}>⤓ Xuất Excel</button>
              <button type="button" className="btn-line" onClick={() => window.print()}>⤓ Xuất PDF</button>
            </div>
          </div>
        </>
      )}

      <FormModal
        open={showForm}
        title={editing ? "Sửa bài thử" : "Thêm bài thử"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-plan-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        {/* key={editing?.id ?? "new"} - fix loi remount giu du lieu cu tu form
            truoc (nhu da ap dung cho Projects/Customers/Centers o ban ah): moi khi
            doi doi tuong dang sua (hoac chuyen sang tao moi), React se huy va tao
            lai toan bo form nay tu dau thay vi tai su dung DOM node cu. */}
        <form key={editing?.id ?? "new"} id="tf-plan-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên bài thử *
            <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          {!editing && (
            <label style={{ fontSize: 12, fontWeight: 600 }}>Dự án *
              <PlainSelect name="projectId" required defaultValue={projectFilter}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </PlainSelect>
            </label>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mẫu
              <PlainSelect name="packId" defaultValue={editing?.packId ?? newItemPackId} onChange={(e) => setTiPackId(e.target.value)}>
                <option value="">—</option>
                {packs.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
              </PlainSelect>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mẫu thử (sample)
              <PlainSelect name="sampleId" defaultValue={editing?.sampleId ?? ""}>
                <option value="">—</option>
                {samples.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </PlainSelect>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Thiết bị
              <PlainSelect name="equipmentId" defaultValue={editing?.equipmentId ?? ""}>
                <option value="">—</option>
                {equipmentOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </PlainSelect>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Phụ trách
              <PlainSelect name="picId" defaultValue={editing?.picId ?? ""}>
                <option value="">—</option>
                {memberOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </PlainSelect>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mức độ ưu tiên
              <PlainSelect name="priority" defaultValue={editing?.priority ?? ""}>
                <option value="">—</option>
                <option value="Cao">Cao</option>
                <option value="Trung bình">Trung bình</option>
                <option value="Thấp">Thấp</option>
              </PlainSelect>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Tiêu chuẩn
              <input name="standard" defaultValue={editing?.standard ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Cấp độ mẫu
              <PlainSelect name="sampleLevel" defaultValue={editing?.sampleLevel ?? ""}>
                <option value="">—</option>
                {LEVEL_OPTIONS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
              </PlainSelect>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Nhóm phụ trách
              <PlainSelect name="team" defaultValue={editing?.team ?? ""}>
                <option value="">—</option>
                {TEAM_OPTIONS.map((tm) => <option key={tm} value={tm}>{TEAM_LABEL[tm]}</option>)}
              </PlainSelect>
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Kết quả
            <PlainSelect name="result" defaultValue={editing?.result ?? ""}>
              <option value="">(tự động)</option>
              <option value="pass">Đạt</option>
              <option value="fail">Không đạt</option>
              <option value="cancel">Hủy</option>
            </PlainSelect>
          </label>
          {seqWarning && (
            <div style={{ background: "#fff4e5", border: "1px solid #f0c36d", color: "#8a5a00", borderRadius: 6, padding: "8px 10px", fontSize: 12 }}>
              ⚠ {seqWarning}
            </div>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Kế hoạch bắt đầu
              <DateField name="planStart" value={tiPlanStart} onChange={setTiPlanStart} style={{ width: "100%", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Kế hoạch kết thúc
              <DateField name="planEnd" value={tiPlanEnd} onChange={setTiPlanEnd} style={{ width: "100%", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Thực tế bắt đầu
              <DateField name="actualStart" value={tiActualStart} onChange={setTiActualStart} style={{ width: "100%", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Thực tế kết thúc
              <DateField name="actualEnd" value={tiActualEnd} onChange={setTiActualEnd} style={{ width: "100%", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--muted)" }}>
            <div style={{ flex: 1 }}>Thời lượng thực tế: <b>{tiDurationDays != null ? (tiDurationDays + " ngày") : "—"}</b></div>
            <div style={{ flex: 1 }}>Kết thúc dự kiến: <b>{tiExpectedEnd ?? "—"}</b></div>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tiến độ (%)
            <input type="number" min={0} max={100} name="progress" defaultValue={editing?.progress ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Ghi chú
            <textarea name="note" defaultValue={editing?.note ?? ""} rows={3} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, resize: "vertical" }} />
          </label>
        </form>
      </FormModal>

      <FormModal
        open={showPackForm}
        title={editingPack ? "Sửa mẫu" : "Thêm mẫu"}
        onClose={() => { setShowPackForm(false); setEditingPack(null) }}
        onSubmit={() => { const f = document.getElementById("tf-pack-form") as HTMLFormElement | null; if (f) handlePackSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form key={editingPack?.id ?? "new-pack"} id="tf-pack-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Dự án *
            <PlainSelect name="projectId" required disabled={!!editingPack} defaultValue={projectFilter}>
              <option value="">—</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </PlainSelect>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Mã mẫu *
            <PlainSelect name="code" required defaultValue={editingPack?.code ?? ""}>
              <option value="">—</option>
              {samples.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
            </PlainSelect>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số seri
              <input name="serial" defaultValue={editingPack?.serial ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số lượng
              <input type="number" min={1} name="qty" defaultValue={editingPack?.qty ?? 1} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Xoá bài thử"
        description="Bạn có chắc muốn xoá bài thử này?"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        danger
      />
      <ConfirmDialog
        open={!!confirmDeletePackId}
        title="Xoá mẫu"
        description="Xoá mẫu này sẽ xoá tất cả bài thử liên quan. Tiếp tục?"
        onCancel={() => setConfirmDeletePackId(null)}
        onConfirm={confirmDeletePack}
        danger
      />
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Xoá bài thử đã chọn"
        description={`Bạn có chắc muốn xoá ${selectedItems.size} bài thử đã chọn? Hành động này không thể hoàn tác.`}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={confirmBulkDeleteItems}
        danger
      />
    </PageShell>
  )
}
