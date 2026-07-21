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
import { saveTask, deleteTask } from "../actions"
import { STATUS_LABEL, PRIORITY_LABEL, type TaskRow, type Option } from "../types"

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

export type TasksViewProps = { tasks: TaskRow[]; projects: Option[]; members: Option[]; initialQuery?: string }

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

export function TasksView({ tasks, projects, members, initialQuery }: TasksViewProps) {
  const [chip, setChip] = useState("all")
  const [q, setQ] = useState(initialQuery || "")
  const [sortKey, setSortKey] = useState<SortKey>("dueDate")
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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

  const filtered = useMemo(() => {
    const list = tasks.filter((t) => {
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
  }, [tasks, chip, q, sortKey, sortDir, members])

  function exportExcel() {
    const header = ["Tên", "Dự án", "Phụ trách", "Hạn chốt", "Ưu tiên", "Trạng thái"]
    const rows = filtered.map((t) => [
      t.title,
      t.project?.name ?? "",
      memberName(t.assigneeId),
      t.dueDate ? t.dueDate.slice(0, 10) : "",
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

  const columns: Array<DataTableColumn<TaskRow>> = [
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
    { key: "priority", header: sortableHeader("priority", "Ưu tiên"), render: (t) => <StatusBadge label={PRIORITY_LABEL[t.priority ?? "med"]} tone={priorityTone(t.priority)} /> },
    { key: "status", header: sortableHeader("status", "Trạng thái"), render: (t) => <StatusBadge label={STATUS_LABEL[t.status ?? "todo"]} tone={statusTone(t.status)} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => openEdit(t)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>
            Sửa
          </button>
          <button type="button" onClick={() => setConfirmDeleteId(t.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>
            Xoá
          </button>
        </span>
      ),
    },
  ]

  return (
    <PageShell
      title="Công việc"
      subtitle="Theo dõi và phân công công việc"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={exportExcel} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff" }}>
            Xuất Excel
          </button>
          <button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>
            + Thêm công việc
          </button>
        </span>
      }
      filters={
        <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm công việc..." }}>
          <ChipFilterDropdown value={chip} options={CHIPS} onChange={setChip} />
        </FilterBar>
      }
    >
      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(t) => t.id}
        loading={pending}
        emptyTitle="Chưa có công việc nào"
        emptyDescription="Nhấn “Thêm công việc” để tạo mới."
      />

      <FormModal
        open={showForm}
        title={editing ? "Sửa công việc" : "Thêm công việc"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-task-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
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
    </PageShell>
  )
}

export default TasksView
