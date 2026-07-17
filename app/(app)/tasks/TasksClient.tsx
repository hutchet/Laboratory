"use client"

import { useMemo, useState, useTransition } from "react"
import { saveTask, deleteTask } from "./actions"

type TaskRow = {
  id: string
  title: string
  description: string | null
  status: string | null
  priority: string | null
  assigneeId: string | null
  projectId: string | null
  dueDate: string | null
  project: { id: string; name: string } | null
}

type Option = { id: string; name: string }

const STATUS_LABEL: Record<string, string> = { todo: "Chưa làm", doing: "Đang làm", done: "Hoàn thành" }
const PRIORITY_LABEL: Record<string, string> = { high: "Cao", med: "Trung bình", low: "Thấp" }
const CHIPS: Array<{ id: string; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "todo", label: "Chưa làm" },
  { id: "doing", label: "Đang làm" },
  { id: "done", label: "Hoàn thành" },
]

function remainingLabel(dueDate: string | null, status: string | null) {
  if (!dueDate) return "—"
  if (status === "done") return "Đã xong"
  const diffMs = new Date(dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  const days = Math.round(diffMs / 86400000)
  if (days < 0) return `Trễ ${Math.abs(days)} ngày`
  if (days === 0) return "Hôm nay"
  return `Còn ${days} ngày`
}

export default function TasksClient({ tasks, projects, members }: { tasks: TaskRow[]; projects: Option[]; members: Option[] }) {
  const [chip, setChip] = useState("all")
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? "—"

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (chip !== "all" && (t.status ?? "todo") !== chip) return false
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [tasks, chip, q])

  function exportCsv() {
    const rows = [["Công việc", "Dự án", "Phụ trách", "Hạn chốt", "Ưu tiên", "Trạng thái"]]
    for (const t of filtered) {
      rows.push([t.title, t.project?.name ?? "", memberName(t.assigneeId), t.dueDate ?? "", PRIORITY_LABEL[t.priority ?? "med"], STATUS_LABEL[t.status ?? "todo"]])
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tasks.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }

  function openEdit(t: TaskRow) {
    setEditing(t)
    setShowForm(true)
  }

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveTask(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoá công việc này?")) return
    startTransition(async () => {
      await deleteTask(id)
    })
  }

  return (
    <section id="page-tasks">
      <div className="card">
        <form id="form" action={onSubmit}>
          <input type="hidden" id="f-id" name="id" defaultValue={editing?.id ?? ""} />
          <div className="row">
            <div className="field" style={{ flex: 2, minWidth: 200 }}>
              <label>Tên công việc *</label>
              <input id="f-name" name="title" required placeholder="VD: Thiết kế màn hình báo cáo" defaultValue={editing?.title ?? ""} key={`name-${editing?.id ?? "new"}`} />
            </div>
            <div className="field">
              <label>Dự án</label>
              <select id="f-project" name="projectId" defaultValue={editing?.projectId ?? ""} key={`proj-${editing?.id ?? "new"}`}>
                <option value="">— Nội bộ —</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>
            <div className="field">
              <label>Phụ trách</label>
              <select id="f-owner" name="assigneeId" defaultValue={editing?.assigneeId ?? ""} key={`own-${editing?.id ?? "new"}`}>
                <option value="">— Chưa giao —</option>
                {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
              </select>
            </div>
            <div className="field">
              <label>Hạn chốt</label>
              <input id="f-deadline" name="dueDate" type="date" defaultValue={editing?.dueDate ? editing.dueDate.slice(0, 10) : ""} key={`due-${editing?.id ?? "new"}`} />
            </div>
            <div className="field">
              <label>Ưu tiên</label>
              <select id="f-priority" name="priority" defaultValue={editing?.priority ?? "med"} key={`pri-${editing?.id ?? "new"}`}>
                <option value="high">Cao</option>
                <option value="med">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
            <div className="field">
              <label>Trạng thái</label>
              <select id="f-status" name="status" defaultValue={editing?.status ?? "doing"} key={`st-${editing?.id ?? "new"}`}>
                <option value="todo">Chưa làm</option>
                <option value="doing">Đang làm</option>
                <option value="done">Hoàn thành</option>
              </select>
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field" style={{ flex: 1, width: "100%" }}>
              <label>Ghi chú</label>
              <textarea id="f-desc" name="description" placeholder="Chi tiết..." defaultValue={editing?.description ?? ""} key={`desc-${editing?.id ?? "new"}`} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn-pri" id="f-submit" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm công việc"}</button>
            {(showForm && editing) && (
              <button type="button" className="btn-line" id="f-cancel" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
            )}
          </div>
        </form>
      </div>
      <div className="toolbar">
        <div className="chips" id="chips">
          {CHIPS.map((c) => (
            <button key={c.id} type="button" className={chip === c.id ? "chip active" : "chip"} onClick={() => setChip(c.id)}>{c.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="search" style={{ maxWidth: 240 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input id="search" placeholder="Tìm..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-line" id="btn-csv" onClick={exportCsv}>⬇ Xuất Excel</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th data-sort="status">Tình trạng</th>
              <th data-sort="name">Công việc</th>
              <th data-sort="project">Dự án</th>
              <th data-sort="owner">Phụ trách</th>
              <th data-sort="deadline">Hạn chốt</th>
              <th data-sort="deadline">Còn lại</th>
              <th data-sort="priority">Ưu tiên</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="tbody">
            {filtered.map((t) => (
              <tr key={t.id}>
                <td><span className={`tag2 st-${t.status ?? "todo"}`}>{STATUS_LABEL[t.status ?? "todo"]}</span></td>
                <td>{t.title}</td>
                <td>{t.project?.name ?? "Nội bộ"}</td>
                <td>{memberName(t.assigneeId)}</td>
                <td>{t.dueDate ? t.dueDate.slice(0, 10) : "—"}</td>
                <td>{remainingLabel(t.dueDate, t.status)}</td>
                <td><span className={`tag2 pri-${t.priority ?? "med"}`}>{PRIORITY_LABEL[t.priority ?? "med"]}</span></td>
                <td>
                  <button className="btn-line" onClick={() => openEdit(t)}>Sửa</button>{" "}
                  <button className="btn-line" onClick={() => onDelete(t.id)}>Xoá</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty" id="empty">Chưa có task nào.</div>}
      </div>
    </section>
  )
}
