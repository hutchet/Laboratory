"use client"

import { useMemo, useState, useTransition } from "react"
import { saveSample, deleteSample } from "./actions"

type Row = { id: string; code: string | null; name: string; customerId: string | null; customerName: string | null; status: string | null; receivedAt: string | null }
type Option = { id: string; name: string }

const STATUS_LABEL: Record<string, string> = { received: "Moi nhan", testing: "Dang thu nghiem", done: "Hoan thanh" }

export default function SamplesClient({ samples, customers }: { samples: Row[]; customers: Option[] }) {
  const [status, setStatus] = useState("all")
  const [customerId, setCustomerId] = useState("")
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const total = samples.length
  const testing = samples.filter((s) => s.status === "testing").length
  const done = samples.filter((s) => s.status === "done").length
  const received = samples.filter((s) => s.status === "received").length

  const filtered = useMemo(() => samples.filter((s) => {
    if (status !== "all" && s.status !== status) return false
    if (customerId && s.customerId !== customerId) return false
    if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [samples, status, customerId, q])

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveSample(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoa mau nay?")) return
    startTransition(async () => { await deleteSample(id) })
  }

  return (
    <section id="page-samples">
      <div className="grid kpis" style={{ marginBottom: 18 }}>
        <div className="kcard kb"><div className="v" id="sm-k-total">{total}</div><div className="l">Tong so mau</div><div className="s">Toan bo he thong</div></div>
        <div className="kcard kp"><div className="v" id="sm-k-testing">{testing}</div><div className="l">Dang thu nghiem</div><div className="s">Mau dang xu ly</div></div>
        <div className="kcard kg"><div className="v" id="sm-k-done">{done}</div><div className="l">Hoan thanh</div><div className="s">Da tra/xu ly xong</div></div>
        <div className="kcard kr"><div className="v" id="sm-k-received">{received}</div><div className="l">Moi nhan, chua xep lich</div><div className="s">Can lap ke hoach</div></div>
      </div>

      <div className="toolbar">
        <div className="chips" id="sm-status-chips">
          {["all", "received", "testing", "done"].map((c) => (
            <button key={c} className={status === c ? "chip active" : "chip"} onClick={() => setStatus(c)}>
              {c === "all" ? "Tat ca" : STATUS_LABEL[c]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select id="sm-filter-customer" style={{ minWidth: 180 }} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Tat ca khach hang</option>
            {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <input id="sm-search" placeholder="Tim ma mau, S/N, du an..." style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="row" style={{ margin: "10px 0" }}>
        <button className="btn-pri" onClick={() => { setEditing(null); setShowForm(true) }}>+ Mau moi</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Ma mau</label><input name="code" defaultValue={editing?.code ?? ""} /></div>
              <div className="field"><label>Ten mau</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field">
                <label>Khach hang</label>
                <select name="customerId" defaultValue={editing?.customerId ?? ""}>
                  <option value="">-- Khong --</option>
                  {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label>Trang thai</label>
                <select name="status" defaultValue={editing?.status ?? "received"}>
                  <option value="received">Moi nhan</option>
                  <option value="testing">Dang thu nghiem</option>
                  <option value="done">Hoan thanh</option>
                </select>
              </div>
              <div className="field"><label>Ngay nhan</label><input type="date" name="receivedAt" defaultValue={editing?.receivedAt ? editing.receivedAt.slice(0, 10) : ""} /></div>
            </div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <div id="sm-body">
        <table>
          <thead><tr><th>Ma mau</th><th>Ten mau</th><th>Khach hang</th><th>Trang thai</th><th>Ngay nhan</th><th>Thao tac</th></tr></thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.code ?? "-"}</td>
                <td>{s.name}</td>
                <td>{s.customerName ?? "-"}</td>
                <td>{STATUS_LABEL[s.status ?? "received"]}</td>
                <td>{s.receivedAt ? s.receivedAt.slice(0, 10) : "-"}</td>
                <td>
                  <button className="btn-line" onClick={() => { setEditing(s); setShowForm(true) }}>Sua</button>
                  <button className="btn-line" onClick={() => onDelete(s.id)}>Xoa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="empty" id="sm-empty">Chua co mau nao duoc dang ky.</div>}
    </section>
  )
}
