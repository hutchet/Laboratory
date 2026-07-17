"use client"

import { useMemo, useState, useTransition } from "react"
import { saveReport, deleteReport } from "./actions"

type Row = { id: string; title: string; content: string | null; projectId: string | null; projectName: string | null; createdAt: string }
type Option = { id: string; name: string }

export default function ReportClient({ reports, projects }: { reports: Row[]; projects: Option[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => reports.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase())), [reports, q])

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveReport(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoa bao cao nay?")) return
    startTransition(async () => { await deleteReport(id) })
  }

  return (
    <section id="page-report">
      <div className="section-head">
        <input className="search" id="rsearch" placeholder="Tim bao cao..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-pri" id="btn-newrproj" onClick={() => { setEditing(null); setShowForm(true) }}>+ Bao cao moi</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Ten bao cao</label><input name="title" defaultValue={editing?.title ?? ""} required /></div>
              <div className="field">
                <label>Du an</label>
                <select name="projectId" defaultValue={editing?.projectId ?? ""}>
                  <option value="">-- Khong --</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
            </div>
            <div className="field"><label>Noi dung</label><textarea name="content" defaultValue={editing?.content ?? ""} /></div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid" id="report-grid">
        {filtered.map((r) => (
          <div className="card" key={r.id}>
            <div className="ch"><h3>{r.title}</h3></div>
            <div className="row"><span>Du an</span><span>{r.projectName ?? "-"}</span></div>
            <div className="row"><span>Ngay tao</span><span>{r.createdAt.slice(0, 10)}</span></div>
            <div className="row">
              <button className="btn-line" onClick={() => { setEditing(r); setShowForm(true) }}>Sua</button>
              <button className="btn-line" onClick={() => onDelete(r.id)}>Xoa</button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div id="report-empty" className="empty">Chua co bao cao nao.</div>}
    </section>
  )
}
