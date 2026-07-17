"use client"

import { useMemo, useState, useTransition } from "react"
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem, addAuditEntry } from "./actions"

type Checklist = { id: string; name: string; done: boolean; dueDate: string | null }
type Cal = { id: string; name: string; code: string | null; calLast: string | null; calInterval: number | null; calVendor: string | null; calCert: string | null; dueLabel: string; dueDate: string | null }
type AuditEntry = { id: string; entity: string | null; actor: string | null; role: string | null; area: string | null; action: string | null; note: string | null; createdAt: string }

const DUE_LABEL: Record<string, string> = { overdue: "Qua han", soon: "Sap den han", ok: "Con han" }

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
      <div className="grid kpis" style={{ marginBottom: 18 }}>
        <div className="kcard kr"><div className="v" id="ql-k-overdue">{overdue}</div><div className="l">Thiet bi qua han hieu chuan</div><div className="s">Can xu ly ngay</div></div>
        <div className="kcard kp"><div className="v" id="ql-k-soon">{soon}</div><div className="l">Sap den han (&le;30 ngay)</div><div className="s">Can len lich tai hieu chuan</div></div>
        <div className="kcard kg"><div className="v" id="ql-k-ok">{ok}</div><div className="l">Con han</div><div className="s">Dang tuan thu</div></div>
        <div className="kcard kb"><div className="v" id="ql-k-audit">{auditCount}</div><div className="l">So ban ghi Audit trail</div><div className="s">Toan bo lich su thao tac</div></div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="ch"><h3>Tieu chi kiem soat theo ISO/IEC 17025:2017</h3><span>Phong thu nghiem duoc quan ly theo cac dieu khoan cua tieu chuan</span></div>
        <form action={onAddChecklist} style={{ marginBottom: 10 }}>
          <input name="name" placeholder="Noi dung checklist moi" required />
          <input type="date" name="dueDate" />
          <button className="btn-line" type="submit">+ Them</button>
        </form>
        <div id="ql-checklist" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {checklist.map((c) => (
            <div className="row" key={c.id}>
              <label><input type="checkbox" checked={c.done} onChange={(e) => onToggle(c.id, e.target.checked)} /> {c.name}</label>
              <span>{c.dueDate ? c.dueDate.slice(0, 10) : "-"}</span>
              <button className="btn-line" onClick={() => onDeleteChecklist(c.id)}>Xoa</button>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, padding: 0, overflowX: "auto" }}>
        <div className="ch" style={{ padding: "16px 18px 0" }}><h3>Lich tai hieu chuan thiet bi</h3><span>Sap xep theo muc do khan cap</span></div>
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Thiet bi</th><th>Ma</th><th>Hieu chuan gan nhat</th><th>Chu ky (thang)</th><th>Han tai hieu chuan</th><th>Trang thai</th></tr></thead>
          <tbody id="ql-cal-body">
            {calibration.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.code ?? "-"}</td>
                <td>{c.calLast ? c.calLast.slice(0, 10) : "-"}</td>
                <td>{c.calInterval ?? "-"}</td>
                <td>{c.dueDate ? c.dueDate.slice(0, 10) : "-"}</td>
                <td>{DUE_LABEL[c.dueLabel] ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {calibration.length === 0 && <div className="empty" id="ql-cal-empty">Chua co thiet bi nao khai bao thong tin hieu chuan.</div>}
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div className="ch ch-toolbar" style={{ padding: "16px 18px 0" }}>
          <div><h3>Nhat ky thao tac (Audit trail)</h3><span>Ghi nhan ai da lam gi, vao luc nao</span></div>
          <div style={{ display: "flex", gap: 8 }}>
            <select id="ql-filter-entity" style={{ minWidth: 160 }} value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">Tat ca doi tuong</option>
              {entities.map((e) => (<option key={e} value={e}>{e}</option>))}
            </select>
            <input id="ql-search" placeholder="Tim theo noi dung..." style={{ width: 200, maxWidth: "100%" }} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <form action={onAddAudit} style={{ padding: "10px 18px" }}>
          <input name="entity" placeholder="Doi tuong" />
          <input name="actor" placeholder="Nguoi thuc hien" />
          <input name="action" placeholder="Hanh dong" />
          <input name="note" placeholder="Chi tiet" />
          <button className="btn-line" type="submit">+ Ghi nhan</button>
        </form>
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Thoi gian</th><th>Nguoi thuc hien</th><th>Vai tro</th><th>Khu vuc</th><th>Hanh dong</th><th>Chi tiet</th></tr></thead>
          <tbody id="ql-audit-body">
            {filteredAudit.map((a) => (
              <tr key={a.id}>
                <td>{a.createdAt.slice(0, 16).replace("T", " ")}</td>
                <td>{a.actor ?? "-"}</td>
                <td>{a.role ?? "-"}</td>
                <td>{a.area ?? a.entity ?? "-"}</td>
                <td>{a.action ?? "-"}</td>
                <td>{a.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAudit.length === 0 && <div className="empty" id="ql-audit-empty">Chua co nhat ky nao.</div>}
      </div>
    </section>
  )
}
