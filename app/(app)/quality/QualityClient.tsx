"use client"

import { useMemo, useState, useTransition } from "react"
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem, addAuditEntry } from "./actions"

type Checklist = { id: string; name: string; done: boolean; dueDate: string | null }
type Cal = { id: string; name: string; calVendor: string | null; calCert: string | null; dueLabel: string; dueDate: string | null }
type AuditEntry = { id: string; entity: string | null; actor: string | null; action: string | null; note: string | null; createdAt: string }

export default function QualityClient({ checklist, calibration, auditEntries }: { checklist: Checklist[]; calibration: Cal[]; auditEntries: AuditEntry[] }) {
  const [entityFilter, setEntityFilter] = useState("")
  const [q, setQ] = useState("")
  const [pending, startTransition] = useTransition()

  const overdue = calibration.filter((c) => c.dueLabel === "overdue").length
  const soon = calibration.filter((c) => c.dueLabel === "soon").length
  const ok = calibration.filter((c) => c.dueLabel === "ok").length
  const auditCount = auditEntries.length

  const filteredAudit = useMemo(() => auditEntries.filter((a) => {
    if (entityFilter && a.entity !== entityFilter) return false
    if (q && !(a.note ?? "").toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [auditEntries, entityFilter, q])

  const entities = Array.from(new Set(auditEntries.map((a) => a.entity).filter(Boolean))) as string[]

  function onToggle(id: string, done: boolean) {
    startTransition(async () => { await toggleChecklistItem(id, done) })
  }

  function onDeleteChecklist(id: string) {
    startTransition(async () => { await deleteChecklistItem(id) })
  }

  function onAddChecklist(formData: FormData) {
    startTransition(async () => { await addChecklistItem(formData) })
  }

  function onAddAudit(formData: FormData) {
    startTransition(async () => { await addAuditEntry(formData) })
  }

  return (
    <section id="page-quality">
      <div className="grid kpis">
        <div className="kcard"><div className="l">Qua han hieu chuan</div><div className="v" id="ql-k-overdue">{overdue}</div></div>
        <div className="kcard"><div className="l">Sap den han</div><div className="v" id="ql-k-soon">{soon}</div></div>
        <div className="kcard"><div className="l">Con han</div><div className="v" id="ql-k-ok">{ok}</div></div>
        <div className="kcard"><div className="l">Ban ghi audit</div><div className="v" id="ql-k-audit">{auditCount}</div></div>
      </div>

      <div className="card">
        <div className="ch"><h3>Checklist ISO 17025</h3></div>
        <form action={onAddChecklist}>
          <input name="name" placeholder="Noi dung checklist moi" required />
          <input type="date" name="dueDate" />
          <button className="btn-line" type="submit">+ Them</button>
        </form>
        <div id="ql-checklist">
          {checklist.map((c) => (
            <div className="row" key={c.id}>
              <label><input type="checkbox" checked={c.done} onChange={(e) => onToggle(c.id, e.target.checked)} /> {c.name}</label>
              <span>{c.dueDate ? c.dueDate.slice(0, 10) : "-"}</span>
              <button className="btn-line" onClick={() => onDeleteChecklist(c.id)}>Xoa</button>
            </div>
          ))}
        </div>
        {checklist.length === 0 && <div className="empty">Chua co checklist nao.</div>}
      </div>

      <div className="card">
        <div className="ch"><h3>Bang hieu chuan thiet bi</h3></div>
        <table>
          <thead><tr><th>Thiet bi</th><th>Don vi hieu chuan</th><th>So chung nhan</th><th>Han hieu chuan</th></tr></thead>
          <tbody id="ql-cal-body">
            {calibration.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.calVendor ?? "-"}</td>
                <td>{c.calCert ?? "-"}</td>
                <td>{c.dueDate ? c.dueDate.slice(0, 10) : "-"} ({c.dueLabel === "overdue" ? "Qua han" : c.dueLabel === "soon" ? "Sap toi" : c.dueLabel === "ok" ? "Con han" : "-"})</td>
              </tr>
            ))}
          </tbody>
        </table>
        {calibration.length === 0 && <div id="ql-cal-empty" className="empty">Chua co du lieu hieu chuan.</div>}
      </div>

      <div className="card">
        <div className="ch"><h3>Nhat ky audit trail</h3></div>
        <form action={onAddAudit}>
          <input name="entity" placeholder="Doi tuong (VD: Task, Equipment)" />
          <input name="actor" placeholder="Nguoi thuc hien" />
          <input name="action" placeholder="Hanh dong" />
          <input name="note" placeholder="Ghi chu" />
          <button className="btn-line" type="submit">+ Ghi nhan</button>
        </form>
        <div className="toolbar">
          <select id="ql-filter-entity" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
            <option value="">Tat ca doi tuong</option>
            {entities.map((e) => (<option key={e} value={e}>{e}</option>))}
          </select>
          <input className="search" id="ql-search" placeholder="Tim theo ghi chu..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>Thoi gian</th><th>Doi tuong</th><th>Nguoi thuc hien</th><th>Hanh dong</th><th>Ghi chu</th></tr></thead>
          <tbody id="ql-audit-body">
            {filteredAudit.map((a) => (
              <tr key={a.id}>
                <td>{a.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td>{a.entity ?? "-"}</td>
                <td>{a.actor ?? "-"}</td>
                <td>{a.action ?? "-"}</td>
                <td>{a.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAudit.length === 0 && <div id="ql-audit-empty" className="empty">Chua co ban ghi audit nao.</div>}
      </div>
    </section>
  )
}
