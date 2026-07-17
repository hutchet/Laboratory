"use client"

import { useMemo, useState, useTransition } from "react"
import { saveProject, deleteProject } from "./actions"

type Row = {
  id: string
  name: string
  status: string | null
  value: number | null
  customerId: string | null
  centerId: string | null
  taskCount: number
  doneCount: number
  overdueCount: number
}

type Option = { id: string; name: string }

const STATUS_LABEL: Record<string, string> = { doing: "Dang lam", done: "Hoan thanh", risk: "Rui ro" }

export default function ProjectsClient({ projects, customers, centers }: { projects: Row[]; customers: Option[]; centers: Option[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const active = projects.filter((p) => p.status !== "done").length
  const inProg = projects.filter((p) => p.status === "doing").length
  const done = projects.filter((p) => p.status === "done").length
  const risk = projects.filter((p) => p.overdueCount > 0).length

  const filtered = useMemo(() => projects.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())), [projects, q])

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveProject(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoa du an nay?")) return
    startTransition(async () => { await deleteProject(id) })
  }

  return (
    <section id="page-projects">
      <div className="grid kpis">
        <div className="kcard"><div className="l">Dang hoat dong</div><div className="v" id="pk-active">{active}</div></div>
        <div className="kcard"><div className="l">Dang thuc hien</div><div className="v" id="pk-prog">{inProg}</div></div>
        <div className="kcard"><div className="l">Hoan thanh</div><div className="v" id="pk-done">{done}</div></div>
        <div className="kcard"><div className="l">Rui ro</div><div className="v" id="pk-risk">{risk}</div></div>
      </div>

      <div className="section-head">
        <input className="search" id="psearch" placeholder="Tim du an..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-pri" id="btn-newproj" onClick={() => { setEditing(null); setShowForm(true) }}>+ Du an moi</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Ten du an</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field">
                <label>Khach hang</label>
                <select name="customerId" defaultValue={editing?.customerId ?? ""}>
                  <option value="">-- Khong --</option>
                  {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Trung tam</label>
                <select name="centerId" defaultValue={editing?.centerId ?? ""}>
                  <option value="">-- Khong --</option>
                  {centers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Trang thai</label>
                <select name="status" defaultValue={editing?.status ?? "doing"}>
                  <option value="doing">Dang lam</option>
                  <option value="done">Hoan thanh</option>
                </select>
              </div>
              <div className="field"><label>Gia tri (VND)</label><input type="number" name="value" defaultValue={editing?.value ?? ""} /></div>
            </div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <div className="proj-grid">
        {filtered.map((p) => (
          <div className="card" key={p.id}>
            <div className="ch"><h3>{p.name}</h3><span>{STATUS_LABEL[p.status ?? "doing"]}</span></div>
            <div className="row"><span>Cong viec</span><span>{p.doneCount}/{p.taskCount}</span></div>
            {p.overdueCount > 0 && <div className="row"><span>Qua han</span><span>{p.overdueCount}</span></div>}
            <div className="row">
              <button className="btn-line" onClick={() => { setEditing(p); setShowForm(true) }}>Sua</button>
              <button className="btn-line" onClick={() => onDelete(p.id)}>Xoa</button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty" id="proj-empty">Chua co du an nao.</div>}
    </section>
  )
}
