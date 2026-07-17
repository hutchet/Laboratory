"use client"

import { useMemo, useState, useTransition } from "react"
import { saveCustomer, deleteCustomer } from "./actions"

type Row = {
  id: string
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  value: number | null
  notes: string | null
  projectCount: number
}

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "d"
}

export default function CustomersClient({ customers }: { customers: Row[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const total = customers.length
  const active = customers.filter((c) => c.projectCount > 0).length
  const projs = customers.reduce((s, c) => s + c.projectCount, 0)
  const value = customers.reduce((s, c) => s + (c.value ?? 0), 0)

  const filtered = useMemo(() => customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [customers, q])

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveCustomer(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoa khach hang nay?")) return
    startTransition(async () => { await deleteCustomer(id) })
  }

  return (
    <section id="page-customers">
      <div className="grid kpis">
        <div className="kcard"><div className="l">Tong khach hang</div><div className="v" id="ck-total">{total}</div></div>
        <div className="kcard"><div className="l">Dang hop tac</div><div className="v" id="ck-active">{active}</div></div>
        <div className="kcard"><div className="l">Du an</div><div className="v" id="ck-projs">{projs}</div></div>
        <div className="kcard"><div className="l">Gia tri</div><div className="v" id="ck-value">{fmtVnd(value)}</div></div>
      </div>

      <div className="section-head">
        <input className="search" placeholder="Tim khach hang..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-pri" onClick={() => { setEditing(null); setShowForm(true) }}>+ Khach hang moi</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Ten khach hang</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field"><label>Nguoi lien he</label><input name="contact" defaultValue={editing?.contact ?? ""} /></div>
              <div className="field"><label>Email</label><input name="email" defaultValue={editing?.email ?? ""} /></div>
            </div>
            <div className="row">
              <div className="field"><label>Dien thoai</label><input name="phone" defaultValue={editing?.phone ?? ""} /></div>
              <div className="field"><label>Dia chi</label><input name="address" defaultValue={editing?.address ?? ""} /></div>
              <div className="field"><label>Gia tri (VND)</label><input type="number" name="value" defaultValue={editing?.value ?? ""} /></div>
            </div>
            <div className="field"><label>Ghi chu</label><textarea name="notes" defaultValue={editing?.notes ?? ""} /></div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <div className="cu-grid" id="cu-grid">
        {filtered.map((c) => (
          <div className="card" key={c.id}>
            <div className="ch"><h3>{c.name}</h3></div>
            <div className="row"><span>Lien he</span><span>{c.contact ?? "-"}</span></div>
            <div className="row"><span>Email</span><span>{c.email ?? "-"}</span></div>
            <div className="row"><span>Dien thoai</span><span>{c.phone ?? "-"}</span></div>
            <div className="row"><span>Du an</span><span>{c.projectCount}</span></div>
            <div className="row">
              <button className="btn-line" onClick={() => { setEditing(c); setShowForm(true) }}>Sua</button>
              <button className="btn-line" onClick={() => onDelete(c.id)}>Xoa</button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="cu-empty-msg" id="cu-empty">Chua co khach hang nao.</div>}
    </section>
  )
}
