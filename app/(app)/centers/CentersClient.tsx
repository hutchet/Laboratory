"use client"

import { useMemo, useState, useTransition } from "react"
import { saveCenter, deleteCenter } from "./actions"
import { useEscapeClose } from "@/lib/useEscapeClose"

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
  activeProjectCount: number
}

const CT_AV_COLORS = ["#5b7bff","#e2665f","#2ab090","#e9963e","#9b6ff7","#3ba0c4"]
function ctInitials(name: string) { const p = name.trim().split(/\s+/); return (p.length >= 2 ? p[0][0] + p[p.length-1][0] : name.slice(0,2)).toUpperCase() }
function ctAvColor(name: string) { let h = 0; for (const c of name) h = (h*31 + c.charCodeAt(0)) & 0xffff; return CT_AV_COLORS[h % CT_AV_COLORS.length] }
function fmtCtVal(n: number) { if (n >= 1e9) return (n/1e9).toFixed(1).replace(/\.0$/, '') + ' Tỷ'; if (n >= 1e6) return Math.round(n/1e6).toLocaleString('vi-VN') + ' Tr'; return n > 0 ? n.toLocaleString('vi-VN') + ' đ' : '0 đ' }

function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN")
}

export default function CentersClient({ centers, canManage }: { centers: CenterRow[]; canManage: boolean }) {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CenterRow | null>(null)
  useEscapeClose(showForm, () => { setShowForm(false); setEditing(null) })
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
          {canManage && (
          <button className="btn-pri" id="btn-newct" onClick={openNew}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Trung tâm mới</button>
          )}
        </div>
      </div>
      {canManage && (
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
      )}
      <div className="cu-grid" id="ct-grid">
        {filtered.map((c) => (
          <div className="cucard" key={c.id}>
            <div className="cucard-head">
              <div className="cu-avatar" style={{ background: ctAvColor(c.name) }}>{ctInitials(c.name)}</div>
              <div className="cucard-title">
                <div className="nm">{c.name}</div>
                <div className="cu-sub">{c.manager ?? "Chưa có người quản lý"}</div>
              </div>
              {canManage && (
              <div className="cucard-acts">
                <button type="button" className="icon-act" title="Sửa" onClick={() => openEdit(c)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button type="button" className="icon-act del" title="Xoá" onClick={() => onDelete(c.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
              )}
            </div>
            <div className="cucard-info">
              {c.phone && (
                <div className="cu-info-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.79 19.79 0 0 1 3 12.11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3.5a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>{c.phone}</span>
                </div>
              )}
              {c.address && (
                <div className="cu-info-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>{c.address}</span>
                </div>
              )}
              {!c.phone && !c.address && (
                <div className="cu-info-row"><span style={{ fontStyle: "italic", fontSize: 12 }}>Chưa có thông tin liên hệ</span></div>
              )}
            </div>
            <div className="cucard-footer">
              <div className="cu-stat"><span className="cu-stat-v">{c.projectCount}</span><span className="cu-stat-l">Dự án</span></div>
              <div className="cu-divider" />
              <div className="cu-stat"><span className="cu-stat-v" style={{ color: "var(--green)" }}>{c.activeProjectCount}</span><span className="cu-stat-l">Đang chạy</span></div>
              <div className="cu-divider" />
              <div className="cu-stat"><span className="cu-stat-v" style={{ color: "var(--amber)" }}>{fmtCtVal(c.projectValue)}</span><span className="cu-stat-l">Giá trị</span></div>
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
