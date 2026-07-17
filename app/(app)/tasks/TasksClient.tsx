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

const STATUS_LABEL: Record<string, string> = { todo: "Chua lam", doing: "Dang lam", done: "Hoan thanh" }
const PRIORITY_LABEL: Record<string, string> = { high: "Cao", med: "Trung binh", low: "Thap" }

export default function TasksClient({ tasks, projects, members }: { tasks: TaskRow[]; projects: Option[]; members: Option[] }) {
  const [chip, setChip] = useState("all")
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<TaskRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (chip !== "all" && t.status !== chip) return false
      if (q && !t.title.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [tasks, chip, q])

  function exportCsv() {
    const rows = [["Cong viec", "Du an", "Phu trach", "Han chot", "Uu tien", "Trang thai"]]
    for (const t of filtered) {
      rows.push([t.title, t.project?.name ?? "", t.assigneeId ?? "", t.dueDate ?? "", t.priority ?? "", t.status ?? ""])
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
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
    if (!confirm("Xoa cong viec nay?")) return
    startTransition(async () => {
      await deleteTask(id)
    })
  }

  return (
    <section id="page-tasks">
      <div className="section-head">
        <h2>Cong viec</h2>
        <button className="btn-pri" onClick={openNew}>+ Them cong viec</button>
      </div>

      {showForm && (
        <div className="card" id="task-form-card">
          <form action={onSubmit}>
            <div className="row">
              <div className="field">
                <label>Ten cong viec</label>
                <input name="title" defaultValue={editing?.title ?? ""} required />
              </div>
              <div className="field">
                <label>Du an</label>
                <select name="projectId" defaultValue={editing?.projectId ?? ""}>
                  <option value="">-- Noi bo --</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Phu trach</label>
                <select name="assigneeId" defaultValue={editing?.assigneeId ?? ""}>
                  <option value="">-- Chua giao --</option>
                  {members.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Han chot</label>
                <input type="date" name="dueDate" defaultValue={editing?.dueDate ? editing.dueDate.slice(0, 10) : ""} />
              </div>
              <div className="field">
                <label>Uu tien</label>
                <select name="priority" defaultValue={editing?.priority ?? "med"}>
                  <option value="high">Cao</option>
                  <option value="med">Trung binh</option>
                  <option value="low">Thap</option>
                </select>
              </div>
              <div className="field">
                <label>Trang thai</label>
                <select name="status" defaultValue={editing?.status ?? "todo"}>
                  <option value="todo">Chua lam</option>
                  <option value="doing">Dang lam</option>
                  <option value="done">Hoan thanh</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Mo ta</label>
              <textarea name="description" defaultValue={editing?.description ?? ""} />
            </div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <div className="toolbar">
        <div className="chips">
          {["all", "todo", "doing", "done"].map((c) => (
            <button key={c} className={chip === c ? "chip active" : "chip"} onClick={() => setChip(c)}>
              {c === "all" ? "Tat ca" : STATUS_LABEL[c]}
            </button>
          ))}
        </div>
        <input className="search" placeholder="Tim cong viec..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-line" onClick={exportCsv}>Xuat CSV</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Trang thai</th>
            <th>Cong viec</th>
            <th>Du an</th>
            <th>Phu trach</th>
            <th>Han chot</th>
            <th>Uu tien</th>
            <th>Thao tac</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((t) => (
            <tr key={t.id}>
              <td>{STATUS_LABEL[t.status ?? "todo"]}</td>
              <td>{t.title}</td>
              <td>{t.project?.name ?? "Noi bo"}</td>
              <td>{t.assigneeId ?? "-"}</td>
              <td>{t.dueDate ? t.dueDate.slice(0, 10) : "-"}</td>
              <td>{PRIORITY_LABEL[t.priority ?? "med"]}</td>
              <td>
                <button className="btn-line" onClick={() => openEdit(t)}>Sua</button>
                <button className="btn-line" onClick={() => onDelete(t.id)}>Xoa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filtered.length === 0 && <div className="empty">Khong co cong viec phu hop.</div>}
    </section>
  )
}
