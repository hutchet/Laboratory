"use client"

import { useMemo, useState, useTransition } from "react"
import { saveCenter, deleteCenter } from "./actions"
import { Perm } from "@/lib/rbac-client"

type CenterRow = {
  id: string
  name: string
  manager: string | null
  phone: string | null
  address: string | null
  notes: string | null
  projectCount: number
  projectValue: number
  customerCount: number
}

function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN")
}

export default function CentersClient({ centers }: { centers: CenterRow[] }) {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CenterRow | null>(null)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => centers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [centers, q])

  const kpi = useMemo(() => {
    const total = centers.length
    const projs = centers.reduce((s, c) => s + c.projectCount, 0)
    const value = centers.reduce((s, c) => s + c.projectValue, 0)
    const customers = centers.reduce((s, c) => s + c.customerCount, 0)
    return { total, projs, value, customers }
  }, [centers])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(c: CenterRow) { setEditing(c); setShowForm(true) }
  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveCenter(formData); setShowForm(false); setEditing(null) })
  }
  function onDelete(id: string) {
    if (!confirm("Xoá trung tâm này?")) return
    startTransition(async () => { await deleteCenter(id) })
  }

  return (
    <section id="page-centers">
      <div className="grid kpis" style={{ marginBottom: 20 }}>
        <div className="kcard kb"><div className="v" id="ctk-total">{kpi.total}</div><div className="l">Tổng trung tâm</div></div>
        <div className="kcard kp"><div className="v" id="ctk-projs">{kpi.projs}</div><div className="l">Tổng dự án liên kết</div></div>
        <div className="kcard kg"><div className="v" id="ctk-value">{fmtVnd(kpi.value)}</div><div className="l">Tổng giá trị dự án</div></div>
        <div className="kcard kr"><div className="v" id="ctk-customers">{kpi.customers}</div><div className="l">Khách hàng liên quan</div></div>
      </div>
      <div className="section-head">
        <h3>Tất cả trung tâm thử nghiệm</h3>
        <div className="tools">
          <div className="search" style={{ maxWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input id="ctsearch" placeholder="Tìm trung tâm..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Perm minPerm="manager"><button className="btn-pri" id="btn-newct" onClick={openNew}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Trung tâm mới</button></Perm>
        </div>
      </div>
      <div className={showForm ? "card" : "card hidden"} id="ct-form" style={{ marginBottom: 18 }} data-perm="manager">
        <form action={onSubmit}>
          <input type="hidden" id="ct-id" name="id" defaultValue={editing?.id ?? ""} />
          <div className="row">
            <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Tên trung tâm *</label><input id="ct-name" name="name" placeholder="VD: Trung tâm thử nghiệm Pin" defaultValue={editing?.name ?? ""} key={`n-${editing?.id ?? "new"}`} required /></div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}><label>Người quản lý</label><input id="ct-manager" name="manager" placeholder="VD: Nguyễn Văn A" defaultValue={editing?.manager ?? ""} key={`m-${editing?.id ?? "new"}`} /></div>
            <div className="field" style={{ flex: 1, minWidth: 140 }}><label>Số điện thoại</label><input id="ct-phone" name="phone" placeholder="09xxxxxxxx" defaultValue={editing?.phone ?? ""} key={`p-${editing?.id ?? "new"}`} /></div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Địa chỉ</label><input id="ct-address" name="address" placeholder="Địa chỉ trung tâm" defaultValue={editing?.address ?? ""} key={`a-${editing?.id ?? "new"}`} /></div>
            <div className="field" style={{ flex: 1, width: "100%" }}><label>Ghi chú</label><input id="ct-notes" name="notes" placeholder="Ghi chú thêm" defaultValue={editing?.notes ?? ""} key={`nt-${editing?.id ?? "new"}`} /></div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn-pri" id="ct-submit" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm trung tâm"}</button>
            <button type="button" className="btn-line" id="ct-cancel" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
          </div>
        </form>
      </div>
      <div className="cu-grid" id="ct-grid">
        {filtered.map((c) => (
          <div className="cucard" key={c.id}>
            <div className="cucard-head">
              <div className="cucard-title"><h4>{c.name}</h4><div className="cu-sub">{c.manager ?? "—"}</div></div>
              <div className="cucard-acts">
                <Perm minPerm="manager">
                  <button className="btn-line" onClick={() => openEdit(c)}>Sửa</button>
                  <button className="btn-line" onClick={() => onDelete(c.id)}>Xoá</button>
                </Perm>
              </div>
            </div>
            <div className="cucard-info">
              <div>{c.phone ?? "—"}</div>
              <div>{c.address ?? "—"}</div>
            </div>
            <div className="cucard-footer">
              <span>{c.projectCount} dự án · {c.customerCount} KH</span>
              <span>{fmtVnd(c.projectValue)} đ</span>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="cu-empty-msg" id="ct-empty">Chưa có trung tâm nào. Nhấn <b>Trung tâm mới</b> để thêm.</div>
      )}
    </section>
  )
}
