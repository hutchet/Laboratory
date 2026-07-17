"use client"

import { useMemo, useState, useTransition } from "react"
import { saveCustomer, deleteCustomer } from "./actions"

type CustomerRow = {
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

function fmtVnd(n: number | null) {
  if (!n) return "0"
  return n.toLocaleString("vi-VN")
}

export default function CustomersClient({ customers }: { customers: CustomerRow[] }) {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [customers, q])

  const kpi = useMemo(() => {
    const total = customers.length
    const active = customers.filter((c) => c.projectCount > 0).length
    const projs = customers.reduce((s, c) => s + c.projectCount, 0)
    const value = customers.reduce((s, c) => s + (c.value ?? 0), 0)
    return { total, active, projs, value }
  }, [customers])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(c: CustomerRow) { setEditing(c); setShowForm(true) }
  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveCustomer(formData); setShowForm(false); setEditing(null) })
  }
  function onDelete(id: string) {
    if (!confirm("Xoá khách hàng này?")) return
    startTransition(async () => { await deleteCustomer(id) })
  }

  return (
    <section id="page-customers">
      <div className="grid kpis" style={{ marginBottom: 20 }}>
        <div className="kcard kb"><div className="v" id="ck-total">{kpi.total}</div><div className="l">Tổng khách hàng</div></div>
        <div className="kcard kp"><div className="v" id="ck-active">{kpi.active}</div><div className="l">Đang có dự án</div></div>
        <div className="kcard kg"><div className="v" id="ck-projs">{kpi.projs}</div><div className="l">Tổng dự án liên quan</div></div>
        <div className="kcard kr"><div className="v" id="ck-value">{fmtVnd(kpi.value)}</div><div className="l">Tổng giá trị hợp đồng</div></div>
      </div>
      <div className="section-head">
        <h3>Tất cả khách hàng</h3>
        <div className="tools">
          <div className="search" style={{ maxWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input id="cusearch" placeholder="Tìm khách hàng..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-pri" id="btn-newcu" onClick={openNew}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Khách hàng mới</button>
        </div>
      </div>
      <div className={showForm ? "card" : "card hidden"} id="cu-form" style={{ marginBottom: 18 }} data-perm="manager">
        <form action={onSubmit}>
          <input type="hidden" id="cu-id" name="id" defaultValue={editing?.id ?? ""} />
          <div className="row">
            <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Tên khách hàng / Công ty *</label><input id="cu-name" name="name" placeholder="VD: Công ty TNHH ABC" defaultValue={editing?.name ?? ""} key={`n-${editing?.id ?? "new"}`} required /></div>
            <div className="field" style={{ flex: 1, minWidth: 160 }}><label>Người liên hệ</label><input id="cu-contact" name="contact" placeholder="VD: Nguyễn Văn A" defaultValue={editing?.contact ?? ""} key={`ct-${editing?.id ?? "new"}`} /></div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}><label>Email</label><input id="cu-email" name="email" type="email" placeholder="contact@company.com" defaultValue={editing?.email ?? ""} key={`e-${editing?.id ?? "new"}`} /></div>
            <div className="field" style={{ flex: 1, minWidth: 140 }}><label>Số điện thoại</label><input id="cu-phone" name="phone" placeholder="09xxxxxxxx" defaultValue={editing?.phone ?? ""} key={`p-${editing?.id ?? "new"}`} /></div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Địa chỉ</label><input id="cu-address" name="address" placeholder="Địa chỉ công ty" defaultValue={editing?.address ?? ""} key={`a-${editing?.id ?? "new"}`} /></div>
            <div className="field" style={{ flex: 1, minWidth: 150 }}><label>Giá trị HĐ (VNĐ)</label><input id="cu-value" name="value" type="number" min={0} placeholder="0" defaultValue={editing?.value ?? ""} key={`v-${editing?.id ?? "new"}`} /></div>
            <div className="field" style={{ flex: 1, width: "100%" }}><label>Ghi chú</label><input id="cu-notes" name="notes" placeholder="Ghi chú thêm" defaultValue={editing?.notes ?? ""} key={`nt-${editing?.id ?? "new"}`} /></div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn-pri" id="cu-submit" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm khách hàng"}</button>
            <button type="button" className="btn-line" id="cu-cancel" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
          </div>
        </form>
      </div>
      <div className="cu-grid" id="cu-grid">
        {filtered.map((c) => (
          <div className="cucard" key={c.id}>
            <div className="cucard-head">
              <div className="cucard-title"><h4>{c.name}</h4><div className="cu-sub">{c.contact ?? "—"}</div></div>
              <div className="cucard-acts">
                <button className="btn-line" onClick={() => openEdit(c)}>Sửa</button>
                <button className="btn-line" onClick={() => onDelete(c.id)}>Xoá</button>
              </div>
            </div>
            <div className="cucard-info">
              <div>{c.email ?? "—"}</div>
              <div>{c.phone ?? "—"}</div>
              <div>{c.address ?? "—"}</div>
            </div>
            <div className="cucard-footer">
              <span>{c.projectCount} dự án</span>
              <span>{fmtVnd(c.value)} đ</span>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="cu-empty-msg" id="cu-empty">Chưa có khách hàng nào. Nhấn <b>Khách hàng mới</b> để thêm.</div>
      )}
    </section>
  )
}
