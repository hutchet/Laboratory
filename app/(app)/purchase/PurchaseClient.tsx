"use client"

import { useState, useTransition } from "react"
import { savePurchase, deletePurchase, deleteAllPurchase } from "./actions"

type Row = { id: string; name: string; quantity: number | null; cost: number | null; status: string | null; note: string | null }

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "d"
}

export default function PurchaseClient({ items }: { items: Row[] }) {
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const total = items.length
  const value = items.reduce((s, i) => s + (i.cost ?? 0) * (i.quantity ?? 1), 0)
  const ongoing = items.filter((i) => i.status === "ongoing").length
  const done = items.filter((i) => i.status === "done").length

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await savePurchase(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoa muc mua sam nay?")) return
    startTransition(async () => { await deletePurchase(id) })
  }

  function onDeleteAll() {
    if (!confirm("Xoa tat ca? Hanh dong khong the hoan tac.")) return
    startTransition(async () => { await deleteAllPurchase() })
  }

  return (
    <section id="page-purchase">
      <div className="grid kpis">
        <div className="kcard"><div className="l">Tong muc</div><div className="v" id="pm-k-total">{total}</div></div>
        <div className="kcard"><div className="l">Gia tri</div><div className="v" id="pm-k-value">{fmtVnd(value)}</div></div>
        <div className="kcard"><div className="l">Dang mua</div><div className="v" id="pm-k-ongoing">{ongoing}</div></div>
        <div className="kcard"><div className="l">Hoan tat</div><div className="v" id="pm-k-done">{done}</div></div>
      </div>

      <div className="section-head">
        <button className="btn-pri" id="pm-add-btn" onClick={() => { setEditing(null); setShowForm(true) }}>+ Them muc</button>
        <button className="btn-line" id="pm-delall-btn" onClick={onDeleteAll}>Xoa tat ca</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Ten hang muc</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field"><label>So luong</label><input type="number" name="quantity" defaultValue={editing?.quantity ?? ""} /></div>
              <div className="field"><label>Don gia (VND)</label><input type="number" name="cost" defaultValue={editing?.cost ?? ""} /></div>
            </div>
            <div className="row">
              <div className="field">
                <label>Trang thai</label>
                <select name="status" defaultValue={editing?.status ?? "ongoing"}>
                  <option value="ongoing">Dang mua</option>
                  <option value="done">Hoan tat</option>
                </select>
              </div>
              <div className="field"><label>Ghi chu</label><input name="note" defaultValue={editing?.note ?? ""} /></div>
            </div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid" id="pm-overview-grid">
        {items.map((i) => (
          <div className="card" key={i.id}>
            <div className="ch"><h3>{i.name}</h3><span>{i.status === "done" ? "Hoan tat" : "Dang mua"}</span></div>
            <div className="row"><span>So luong</span><span>{i.quantity ?? "-"}</span></div>
            <div className="row"><span>Don gia</span><span>{i.cost ? fmtVnd(i.cost) : "-"}</span></div>
            <div className="row"><span>Thanh tien</span><span>{fmtVnd((i.cost ?? 0) * (i.quantity ?? 1))}</span></div>
            <div className="row">
              <button className="btn-line" onClick={() => { setEditing(i); setShowForm(true) }}>Sua</button>
              <button className="btn-line" onClick={() => onDelete(i.id)}>Xoa</button>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <div id="pm-empty" className="empty">Chua co hang muc mua sam nao.</div>}
    </section>
  )
}
