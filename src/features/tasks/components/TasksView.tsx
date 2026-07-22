"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { AvatarInitials } from "@/shared/ui/avatar-initials"
import { ChipFilterDropdown, type ChipFilterOption } from "@/shared/ui/chip-filter"
import { CustomSelect } from "@/shared/ui/custom-select"
import { KpiCard } from "@/shared/ui/kpi-card"
import { saveTask, deleteTask, bulkDeleteTasks } from "../actions"
import { STATUS_LABEL, PRIORITY_LABEL, type TaskRow, type Option, type CenterOption } from "../types"

// Ported from the original app's SOON_DAYS=3 constant + stateOf(t) helper
// (line 4025/4620 of the original HTML): a task is "over" once its due date
// has passed, "soon" if it's due within SOON_DAYS days, otherwise "ok".
const SOON_DAYS = 3

function taskState(t: TaskRow): "done" | "over" | "soon" | "none" | "ok" {
  if (t.status === "done") return "done"
  if (!t.dueDate) return "none"
  const d = Math.round((new Date(t.dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (d < 0) return "over"
  if (d <= SOON_DAYS) return "soon"
  return "ok"
}

// Ported from the original app's daysLeft() helper (renderTasks(), ~line 5118-5140):
// cột "còn lại" của bảng công việc — hiển thị số ngày trễ / hôm nay / còn bao nhiêu ngày.
function daysLeftLabel(t: TaskRow): string {
  if (t.status === "done") return "—"
  if (!t.dueDate) return "—"
  const d = Math.round((new Date(t.dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (d < 0) return `${Math.abs(d)} ngày trễ`
  if (d === 0) return "Hôm nay"
  return `còn ${d} ngày`
}

// Same options/order/dot colors as the original renderTaskFilterChips().
const CHIPS: ChipFilterOption[] = [
  { value: "all", label: "Tất cả" },
  { value: "over", label: "Quá hạn", dot: "var(--red)" },
  { value: "soon", label: "Sắp tới", dot: "var(--amber)" },
  { value: "pending", label: "Chưa xong" },
  { value: "done", label: "Hoàn thành", dot: "var(--green)" },
]

function statusTone(status: string | null): "neutral" | "info" | "success" {
  if (status === "done") return "success"
  if (status === "doing") return "info"
  return "neutral"
}

function priorityTone(priority: string | null): "neutral" | "warning" | "danger" {
  if (priority === "high") return "danger"
  if (priority === "med") return "warning"
  return "neutral"
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase()
}

const NO_CENTER = "__none__"

// Trend thằt theo dữ liệu thật (createdAt) cho 4 thẻ KPI ở trang hub — cùng tinh
// thần với computeKpiTrend/computeKpiSparklines của trang Tổng quan: sparkline 7
// điểm (số mục phát sinh mỗi ngày trong 7 ngày qua) + % thay đổi so với 7 ngày trước đó.
function computeCreatedTrend(dates: string[]): { pct: number; up: boolean; sparkline: number[] } {
  const now = Date.now()
  const day = 86400000
  const buckets: number[] = new Array(7).fill(0)
  let prevWeek = 0
  for (const d of dates) {
    const diffDays = Math.floor((now - new Date(d).getTime()) / day)
    if (diffDays >= 0 && diffDays < 7) buckets[6 - diffDays]++
    else if (diffDays >= 7 && diffDays < 14) prevWeek++
  }
  const thisWeek = buckets.reduce((a, b) => a + b, 0)
  const pct = prevWeek === 0 ? (thisWeek > 0 ? 100 : 0) : Math.round(((thisWeek - prevWeek) / prevWeek) * 100)
  return { pct: Math.abs(pct), up: thisWeek >= prevWeek, sparkline: buckets }
}

export type TasksViewProps = { tasks: TaskRow[]; projects: Option[]; members: Option[]; centers: CenterOption[]; initialQuery?: string }

// Ported from the original app's esc()+CSV-friendly quoting used by AuditPlan/Purchase CSV export.
function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").split('"').join('""')}"`).join(",")).join("\r\n")
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

type SortKey = "title" | "project" | "assignee" | "dueDate" | "priority" | "status"
const PRIORITY_RANK: Record<string, number> = { high: 3, med: 2, low: 1 }

export function TasksView({ tasks, projects, members, centers, initialQuery }: TasksViewProps) {
  // Trang "Danh sách trung tâm" (hub-card, mô hình giống trang Trung tâm) — mỗi nhân viên
  // thuộc trung tâm nào sẽ vào thẻ đó để xem/tạo danh sách công việc của mình.
  const [openCenterId, setOpenCenterId] = useState<string | null>(null)
  const [chip, setChip] = useState("all")
  const [q, setQ] = useState(initialQuery || "")
  const [sortKey, setSortKey] = useState<SortKey>("dueDate")
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // CustomSelect la component dieu khien bang state (khong tu sinh input co
  // "name" nhu <select> goc) - dong bo lai moi khi mo form de tranh loi giu
  // du lieu cu tu bai thu truoc (cung nguyen nhan da fix o PlanView ban ba).
  const [tProjectId, setTProjectId] = useState("")
  const [tAssigneeId, setTAssigneeId] = useState("")
  const [tPriority, setTPriority] = useState("med")
  const [tStatus, setTStatus] = useState("todo")

  useEffect(() => {
    if (showForm) {
      setTProjectId(editing?.projectId ?? "")
      setTAssigneeId(editing?.assigneeId ?? "")
      setTPriority(editing?.priority ?? "med")
      setTStatus(editing?.status ?? "todo")
    }
  }, [showForm, editing])

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? "—"
  const centerName = (id: string) => (id === NO_CENTER ? "Không thuộc trung tâm" : centers.find((c) => c.id === id)?.name ?? "—")

  // Thống kê theo từng thẻ trung tâm (mô hình giống trang Trung tâm): số công việc, quá hạn,
  // hoàn thành. Tasks chưa gắn centerId gộp vào thẻ "Không thuộc trung tâm" để không ẩn dữ liệu.
  const centerCards = useMemo(() => {
    const byCenter = new Map<string, TaskRow[]>()
    for (const t of tasks) {
      const key = t.centerId || NO_CENTER
      if (!byCenter.has(key)) byCenter.set(key, [])
      byCenter.get(key)!.push(t)
    }
    const cards = centers.map((c) => ({ id: c.id, name: c.name, list: byCenter.get(c.id) || [] }))
    const orphan = byCenter.get(NO_CENTER) || []
    if (orphan.length) cards.push({ id: NO_CENTER, name: "Không thuộc trung tâm", list: orphan })
    return cards.map((c) => ({
      id: c.id,
      name: c.name,
      count: c.list.length,
      done: c.list.filter((t) => t.status === "done").length,
      overdue: c.list.filter((t) => taskState(t) === "over").length,
    }))
  }, [tasks, centers])

  const hubKpis = useMemo(() => ({
    totalCenters: centerCards.length,
    totalTasks: tasks.length,
    overdue: tasks.filter((t) => taskState(t) === "over").length,
    done: tasks.filter((t) => t.status === "done").length,
  }), [tasks, centerCards])

  const hubTrends = useMemo(() => ({
    totalTasks: computeCreatedTrend(tasks.map((t) => t.createdAt)),
    overdue: computeCreatedTrend(tasks.filter((t) => taskState(t) === "over").map((t) => t.createdAt)),
    done: computeCreatedTrend(tasks.filter((t) => t.status === "done").map((t) => t.createdAt)),
  }), [tasks])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1))
    else { setSortKey(key); setSortDir(1) }
  }
  function sortIndicator(key: SortKey) { return sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : "" }
  function sortableHeader(key: SortKey, label: string) {
    return (
      <span onClick={() => toggleSort(key)} style={{ cursor: "pointer", userSelect: "none" }}>
        {label}{sortIndicator(key)}
      </span>
    )
  }

  const scopedTasks = useMemo(() => {
    if (!openCenterId) return tasks
    if (openCenterId === NO_CENTER) return tasks.filter((t) => !t.centerId)
    return tasks.filter((t) => t.centerId === openCenterId)
  }, [tasks, openCenterId])

  const filtered = useMemo(() => {
    const list = scopedTasks.filter((t) => {
      if (chip === "over" && taskState(t) !== "over") return false
      if (chip === "soon" && taskState(t) !== "soon") return false
      if (chip === "done" && t.status !== "done") return false
      if (chip === "pending" && t.status === "done") return false
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
    const sorted = [...list].sort((a, b) => {
      let va: string | number = ""
      let vb: string | number = ""
      if (sortKey === "dueDate") { va = a.dueDate || "9999"; vb = b.dueDate || "9999" }
      else if (sortKey === "priority") { va = PRIORITY_RANK[a.priority ?? "med"] || 0; vb = PRIORITY_RANK[b.priority ?? "med"] || 0 }
      else if (sortKey === "assignee") { va = memberName(a.assigneeId); vb = memberName(b.assigneeId) }
      else if (sortKey === "project") { va = a.project?.name ?? ""; vb = b.project?.name ?? "" }
      else if (sortKey === "status") { va = a.status ?? "todo"; vb = b.status ?? "todo" }
      else { va = a.title.toLowerCase(); vb = b.title.toLowerCase() }
      if (va < vb) return -sortDir
      if (va > vb) return sortDir
      return 0
    })
    return sorted
  }, [scopedTasks, chip, q, sortKey, sortDir, members])

  function exportExcel() {
    const header = ["Tên", "Dự án", "Phụ trách", "Hạn chốt", "Còn lại", "Ưu tiên", "Trạng thái"]
    const rows = filtered.map((t) => [
      t.title,
      t.project?.name ?? "",
      memberName(t.assigneeId),
      t.dueDate ? t.dueDate.slice(0, 10) : "",
      daysLeftLabel(t),
      PRIORITY_LABEL[t.priority ?? "med"],
      STATUS_LABEL[t.status ?? "todo"],
    ])
    downloadCsv("vinfast-tasks.csv", [header, ...rows])
  }

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(t: TaskRow) {
    setEditing(t)
    setShowForm(true)
  }

  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || ""),
      status: String(formData.get("status") || "todo"),
      priority: String(formData.get("priority") || "med"),
      assigneeId: String(formData.get("assigneeId") || "") || null,
      projectId: String(formData.get("projectId") || "") || null,
      dueDate: String(formData.get("dueDate") || "") || null,
    }
    startTransition(async () => {
      await saveTask(input)
      setShowForm(false)
      setEditing(null)
    })
  }

  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => {
      await deleteTask(id)
      setConfirmDeleteId(null)
    })
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id))
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(filtered.map((t) => t.id))))
  }
  function toggleEditMode() {
    setEditMode((v) => { if (v) setSelected(new Set()); return !v })
  }
  function confirmBulkDelete() {
    const ids = Array.from(selected)
    startTransition(async () => { await bulkDeleteTasks(ids); setSelected(new Set()); setBulkConfirm(false) })
  }

  // Chuẩn hóa "chức năng chỉnh sửa" giống mọi module khác (PurchaseView): mặc định ẩn ô tick
  // chọn + nút Sửa/Xoá, chỉ hiện khi bật "Chỉnh sửa"; có ô vuông chọn tất cả ở header; 2 chữ
  // Sửa/Xoá bọc nền bằng class .txt-act (pri/del).
  const columns: Array<DataTableColumn<TaskRow>> = [
    {
      key: "sel",
      header: editMode ? <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /> : "",
      defaultWidth: 40,
      render: (t) =>
        editMode ? (
          <input type="checkbox" checked={selected.has(t.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(t.id)} />
        ) : null,
    },
    { key: "title", header: sortableHeader("title", "Công việc"), render: (t) => <span style={{ fontWeight: 600 }}>{t.title}</span> },
    { key: "project", header: sortableHeader("project", "Dự án"), render: (t) => t.project?.name ?? "—" },
    {
      key: "assignee",
      header: sortableHeader("assignee", "Phụ trách"),
      render: (t) => (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <AvatarInitials name={memberName(t.assigneeId)} size={22} />
          {memberName(t.assigneeId)}
        </span>
      ),
    },
    { key: "dueDate", header: sortableHeader("dueDate", "Hạn chốt"), render: (t) => (t.dueDate ? new Date(t.dueDate).toLocaleDateString("vi-VN") : "—") },
    { key: "left", header: "Còn lại", render: (t) => daysLeftLabel(t) },
    { key: "priority", header: sortableHeader("priority", "Ưu tiên"), render: (t) => <StatusBadge label={PRIORITY_LABEL[t.priority ?? "med"]} tone={priorityTone(t.priority)} /> },
    { key: "status", header: sortableHeader("status", "Trạng thái"), render: (t) => <StatusBadge label={STATUS_LABEL[t.status ?? "todo"]} tone={statusTone(t.status)} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) =>
        editMode ? (
          <span className="acts" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="txt-act pri" onClick={() => openEdit(t)}>Sửa</button>
            <button type="button" className="txt-act del" onClick={() => setConfirmDeleteId(t.id)}>Xoá</button>
          </span>
        ) : null,
    },
  ]

  return (
    <PageShell
      title="Công việc"
      subtitle={openCenterId ? `Trung tâm: ${centerName(openCenterId)}` : "Theo dõi và phân công công việc theo trung tâm"}
      actions={
        openCenterId ? (
          <span style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn-line" onClick={exportExcel}>
              Xuất Excel
            </button>
            {editMode && (
              <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xoá tất cả</button>
            )}
            <button type="button" className={editMode ? "btn-success" : "btn-line"} onClick={toggleEditMode}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
            <button type="button" className="btn-pri" onClick={openNew}>
              + Thêm công việc
            </button>
          </span>
        ) : undefined
      }
      filters={
        openCenterId ? (
          <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm công việc..." }}>
            <ChipFilterDropdown value={chip} options={CHIPS} onChange={setChip} />
          </FilterBar>
        ) : undefined
      }
    >
      {!openCenterId && (
        <>
          <div className="kpis-tier" style={{ marginBottom: 20 }}>
            <KpiCard label="Tổng trung tâm" value={hubKpis.totalCenters} />
            <KpiCard label="Tổng công việc" value={hubKpis.totalTasks} tone="warning" trend={hubTrends.totalTasks} />
            <KpiCard label="Quá hạn" value={hubKpis.overdue} tone="danger" trend={hubTrends.overdue} />
            <KpiCard label="Hoàn thành" value={hubKpis.done} tone="success" trend={hubTrends.done} />
          </div>
          <div className="cu-grid">
            {centerCards.map((c) => (
              <div key={c.id} className="hub-card" onClick={() => setOpenCenterId(c.id)} style={{ cursor: "pointer" }}>
                <div className="hub-top">
                  <div className="hub-icon">{initials(c.name)}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "#8a8f98" }}>{c.count} công việc</div>
                  </div>
                </div>
                <div className="hub-stats" style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12 }}>
                  <span>Hoàn thành: <b>{c.done}</b></span>
                  <span>Quá hạn: <b>{c.overdue}</b></span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {openCenterId && (
        <>
          <button type="button" className="btn-line" style={{ marginBottom: 12 }} onClick={() => setOpenCenterId(null)}>
            ‹ Danh sách trung tâm
          </button>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(t) => t.id}
            loading={pending}
            emptyTitle="Chưa có công việc nào"
            emptyDescription="Nhấn “Thêm công việc” để tạo mới."
            onRowClick={(t) => openEdit(t)}
            resizable
            maxBodyHeight={520}
          />
        </>
      )}

      <FormModal
        open={showForm}
        title={editing ? "Sửa công việc" : "Thêm công việc"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-task-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
        width={720}
      >
        <form key={editing?.id ?? "new"} id="tf-task-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="projectId" value={tProjectId} />
          <input type="hidden" name="assigneeId" value={tAssigneeId} />
          <input type="hidden" name="priority" value={tPriority} />
          <input type="hidden" name="status" value={tStatus} />
          <div className="field">
            <label>Tên công việc *</label>
            <input name="title" required defaultValue={editing?.title ?? ""} />
          </div>
          <div className="field">
            <label>Mô tả</label>
            <textarea name="description" defaultValue={editing?.description ?? ""} />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Dự án</label>
              <CustomSelect value={tProjectId} onChange={setTProjectId} width="100%" options={[{ value: "", label: "—" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Phụ trách</label>
              <CustomSelect value={tAssigneeId} onChange={setTAssigneeId} width="100%" options={[{ value: "", label: "—" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Ưu tiên</label>
              <CustomSelect value={tPriority} onChange={setTPriority} width="100%" options={[{ value: "high", label: "Cao" }, { value: "med", label: "Trung bình" }, { value: "low", label: "Thấp" }]} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Trạng thái</label>
              <CustomSelect value={tStatus} onChange={setTStatus} width="100%" options={[{ value: "todo", label: "Chưa làm" }, { value: "doing", label: "Đang làm" }, { value: "done", label: "Hoàn thành" }]} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Hạn chốt</label>
              <input type="date" name="dueDate" defaultValue={editing?.dueDate ? editing.dueDate.slice(0, 10) : ""} />
            </div>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Xoá công việc?"
        description="Hành động này không thể hoàn tác."
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
      <ConfirmDialog
        open={bulkConfirm}
        title="Xoá các công việc đã chọn?"
        description={`Sẽ xoá ${selected.size} công việc đã chọn. Hành động này không thể hoàn tác.`}
        danger
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />
    </PageShell>
  )
}

export default TasksView
