"use client"

import { useMemo, useState, useTransition } from "react"
import { saveCenter, deleteCenter } from "./actions"

type Row = { id: string; name: string; manager: string | null; phone: string | null; address: string | null; notes: string | null; projectCount: number; projectValue: number; customerCount: number }

export default function CentersClient({ centers }: { centers: Row[] }) {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const [pending, startTransition] = useTransition()

  const ctkTotal = centers.length
  const ctkProjs = centers.reduce((s, c) => s + c.projectCount, 0)
  const ctkValue = centers.reduce((s, c) => s + c.projectValue, 0)
  const ctkCustomers = centers.reduce((s, c) => s + c.customerCount, 0)

  const filtered = useMemo(() => centers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [centers, q])

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
      <div className="grid kpis" style={{ marginBottom: 20 }}>
        <div className="kcard kb"><div className="v" id="ctk-total">{ctkTotal}</div><div className="l">Tong trung tam</div></div>
        <div className="kcard kp"><div className="v" id="ctk-projs">{ctkProjs}</div><div className="l">Tong du an lien ket</div></div>
        <div className="kcard kg"><div className="v" id="ctk-value">{ctkValue.toLocaleString("vi-VN")}</div><div className="l">Tong gia tri du an</div></div>
        <div className="kcard kr"><div className="v" id="ctk-customers">{ctkCustomers}</div><div className="l">Khach hang lien quan</div></div>
      </div>

      <div className="section-head">
        <h3>Tat ca trung tam thu nghiem</h3>
        <div className="tools">
          <div className="search" style={{ maxWidth: 260 }}>
            <input id="ctsearch" placeholder="Tim trung tam..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-pri" id="btn-newct" onClick={() => { setEditing(null); setShowForm(true) }}>+ Trung tam moi</button>
        </div>
      </div>

      {showForm && (
        <div className="card" id="ct-form" style={{ marginBottom: 18 }}>
          <form action={onSubmit}>
            <input type="hidden" id="ct-id" />
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Ten trung tam *</label><input id="ct-name" name="name" placeholder="VD: Trung tam thu nghiem Pin" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field" style={{ flex: 1, minWidth: 180 }}><label>Nguoi quan ly</label><input id="ct-manager" name="manager" placeholder="VD: Nguyen Van A" defaultValue={editing?.manager ?? ""} /></div>
              <div className="field" style={{ flex: 1, minWidth: 140 }}><label>So dien thoai</label><input id="ct-phone" name="phone" placeholder="09xxxxxxxx" defaultValue={editing?.phone ?? ""} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Dia chi</label><input id="ct-address" name="address" placeholder="Dia chi trung tam" defaultValue={editing?.address ?? ""} /></div>
              <div className="field" style={{ flex: 1, width: "100%" }}><label>Ghi chu</label><input id="ct-notes" name="notes" placeholder="Ghi chu them" defaultValue={editing?.notes ?? ""} /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn-pri" id="ct-submit" disabled={pending}>{editing ? "Luu" : "+ Them trung tam"}</button>
              <button type="button" className="btn-line" id="ct-cancel" onClick={() => { setShowForm(false); setEditing(null) }}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <div className="cu-grid" id="ct-grid">
        {filtered.map((c) => (
          <div className="card" key={c.id}>
            <div className="ch"><h3>{c.name}</h3></div>
            <div className="row"><span>Nguoi quan ly</span><span>{c.manager ?? "-"}</span></div>
            <div className="row"><span>Dien thoai</span><span>{c.phone ?? "-"}</span></div>
            <div className="row"><span>Dia chi</span><span>{c.address ?? "-"}</span></div>
            <div className="row"><span>Du an</span><span>{c.projectCount}</span></div>
            <div className="row">
              <button className="btn-line" onClick={() => { setEditing(c); setShowForm(true) }}>Sua</button>
              <button className="btn-line" onClick={() => onDelete(c.id)}>Xoa</button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="cu-empty-msg" id="ct-empty">Chua co trung tam nao. Nhan <b>Trung tam moi</b> de them.</div>
      )}
    </section>
  )
}
