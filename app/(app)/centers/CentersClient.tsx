"use client"

import { useState, useTransition } from "react"
import { saveCenter, deleteCenter } from "./actions"

type Row = { id: string; name: string; manager: string | null; phone: string | null; address: string | null; notes: string | null; projectCount: number; equipmentValue: number; customerCount: number }

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "d"
}

export default function CentersClient({ centers }: { centers: Row[] }) {
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const total = centers.length
  const projs = centers.reduce((s, c) => s + c.projectCount, 0)
  const value = centers.reduce((s, c) => s + c.equipmentValue, 0)
  const customers = centers.reduce((s, c) => s + c.customerCount, 0)

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveCenter(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoa trung tam nay?")) return
    startTransition(async () => { await deleteCenter(id) })
  }

  return (
    <section id="page-centers">
      <div className="grid kpis">
        <div className="kcard"><div className="l">Tong trung tam</div><div className="v" id="ctk-total">{total}</div></div>
        <div className="kcard"><div className="l">Du an</div><div className="v" id="ctk-projs">{projs}</div></div>
        <div className="kcard"><div className="l">Gia tri thiet bi</div><div className="v" id="ctk-value">{fmtVnd(value)}</div></div>
        <div className="kcard"><div className="l">Khach hang</div><div className="v" id="ctk-customers">{customers}</div></div>
      </div>

      <div className="section-head">
        <button className="btn-pri" id="btn-newct" onClick={() => { setEditing(null); setShowForm(true) }}>+ Trung tam moi</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Ten trung tam</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field"><label>Quan ly</label><input name="manager" defaultValue={editing?.manager ?? ""} /></div>
              <div className="field"><label>Dien thoai</label><input name="phone" defaultValue={editing?.phone ?? ""} /></div>
            </div>
            <div className="field"><label>Dia chi</label><input name="address" defaultValue={editing?.address ?? ""} /></div>
            <div className="field"><label>Ghi chu</label><textarea name="notes" defaultValue={editing?.notes ?? ""} /></div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <div className="cu-grid" id="ct-grid">
        {centers.map((c) => (
          <div className="card" key={c.id}>
            <div className="ch"><h3>{c.name}</h3></div>
            <div className="row"><span>Quan ly</span><span>{c.manager ?? "-"}</span></div>
            <div className="row"><span>Dien thoai</span><span>{c.phone ?? "-"}</span></div>
            <div className="row"><span>Du an</span><span>{c.projectCount}</span></div>
            <div className="row">
              <button className="btn-line" onClick={() => { setEditing(c); setShowForm(true) }}>Sua</button>
              <button className="btn-line" onClick={() => onDelete(c.id)}>Xoa</button>
            </div>
          </div>
        ))}
      </div>
      {centers.length === 0 && <div className="cu-empty-msg" id="ct-empty">Chua co trung tam nao.</div>}
    </section>
  )
}
