"use client"

import { useMemo, useState, useTransition } from "react"
import { saveTestCatalogItem, deleteTestCatalogItems } from "./actions"

type Row = { id: string; code: string | null; name: string; standard: string | null; sampleQty: string | null; leadTime: string | null; price: number | null }

function fmtVnd(n: number) { return n.toLocaleString("vi-VN") }

export default function QuoteCatalogClient({ items, canManage = true }: { items: Row[]; canManage?: boolean }) {
  const [q, setQ] = useState("")
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => items.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()) || (i.code ?? "").toLowerCase().includes(q.toLowerCase())), [items, q])

  function toggle(id: string) { setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) }
  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(r: Row) { setEditing(r); setShowForm(true) }
  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveTestCatalogItem(formData); setShowForm(false); setEditing(null) })
  }
  function bulkDelete() {
    if (selected.length === 0) return
    if (!confirm(`Xoá ${selected.length} bài thử đã chọn?`)) return
    startTransition(async () => { await deleteTestCatalogItems(selected); setSelected([]) })
  }

  return (
    <section id="page-quote-catalog">
      <div className="section-head">
        <h3>Danh mục bài thử nghiệm (<span id="qtc-count">{items.length}</span>)</h3>
        <div className="tools">
          <div className="search" style={{ maxWidth: 260 }}>
            <input id="qtc-search" placeholder="Tìm bài thử..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {canManage && <button className="btn-line" id="qtc-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected([]) }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>}
          {canManage && editMode && (
            <button className="btn-danger" id="qtc-bulk-del" disabled={selected.length === 0 || pending} onClick={bulkDelete}>Xoá đã chọn (<span id="qtc-bulk-count">{selected.length}</span>)</button>
          )}
          {canManage && <button className="btn-pri" id="qtc-add" onClick={openNew}>+ Thêm bài thử</button>}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form action={onSubmit}>
            <input type="hidden" name="id" defaultValue={editing?.id ?? ""} />
            <div className="row">
              <div className="field"><label>Mã</label><input name="code" defaultValue={editing?.code ?? ""} key={`c-${editing?.id ?? "new"}`} /></div>
              <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Tên bài thử nghiệm *</label><input name="name" required defaultValue={editing?.name ?? ""} key={`n-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Tiêu chuẩn</label><input name="standard" defaultValue={editing?.standard ?? ""} key={`s-${editing?.id ?? "new"}`} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field"><label>Cấp mẫu</label><input name="sampleQty" defaultValue={editing?.sampleQty ?? ""} key={`sq-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Thời gian xử lý</label><input name="leadTime" defaultValue={editing?.leadTime ?? ""} key={`lt-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Đơn giá đã duyệt (VNĐ)</label><input type="number" name="price" defaultValue={editing?.price ?? ""} key={`p-${editing?.id ?? "new"}`} /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn-pri" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm"}</button>
              <button type="button" className="btn-line" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div className="qs-box" id="qtc-scrollbox">
        <table className="rz-table" id="qtc-table">
          <thead>
            <tr>
              {editMode && (
                <th style={{ width: 32 }}>
                  <input type="checkbox" className="selall-chk" checked={filtered.length > 0 && filtered.every((r) => selected.includes(r.id))} onChange={(e) => setSelected(e.target.checked ? filtered.map((r) => r.id) : [])} />
                </th>
              )}
              <th>Số thứ tự</th><th>Mã</th><th>Tên bài thử nghiệm</th><th>Tiêu chuẩn</th><th>Cấp mẫu</th><th>Thời gian xử lý</th><th>Đơn giá đã duyệt (VNĐ)</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="qtc-body">
            {filtered.map((r, idx) => (
              <tr key={r.id}>
                {editMode && <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>}
                <td>{idx + 1}</td>
                <td>{r.code ?? "—"}</td>
                <td>{r.name}</td>
                <td>{r.standard ?? "—"}</td>
                <td>{r.sampleQty ?? "—"}</td>
                <td>{r.leadTime ?? "—"}</td>
                <td>{fmtVnd(r.price ?? 0)}</td>
                <td><button className="btn-line" onClick={() => openEdit(r)}>Sửa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && <div className="empty" id="qtc-empty">Chưa có bài thử nghiệm nào.</div>}
      </div>
    </section>
  )
}
