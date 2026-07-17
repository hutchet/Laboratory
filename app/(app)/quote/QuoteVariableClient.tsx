"use client"

import { useState, useTransition } from "react"
import { saveVariableCost, deleteVariableCosts } from "./actions"

type Row = { id: string; costType: string; description: string | null; amount: number | null }

function fmtVnd(n: number) { return n.toLocaleString("vi-VN") }

export default function QuoteVariableClient({ items, canManage = true }: { items: Row[]; canManage?: boolean }) {
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  function toggle(id: string) { setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) }
  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(r: Row) { setEditing(r); setShowForm(true) }
  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveVariableCost(formData); setShowForm(false); setEditing(null) })
  }
  function bulkDelete() {
    if (selected.length === 0) return
    if (!confirm(`Xoá ${selected.length} chi phí đã chọn?`)) return
    startTransition(async () => { await deleteVariableCosts(selected); setSelected([]) })
  }

  return (
    <section id="page-quote-variable">
      <div className="section-head">
        <h3>Chi phí biến đổi khác</h3>
        <div className="tools">
          {canManage && <button className="btn-line" id="qtv-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected([]) }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>}
          {canManage && editMode && (
            <button className="btn-danger" id="qtv-bulk-del" disabled={selected.length === 0 || pending} onClick={bulkDelete}>Xoá đã chọn (<span id="qtv-bulk-count">{selected.length}</span>)</button>
          )}
          {canManage && <button className="btn-pri" id="qtv-add" onClick={openNew}>+ Thêm chi phí</button>}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form action={onSubmit}>
            <input type="hidden" name="id" defaultValue={editing?.id ?? ""} />
            <div className="row">
              <div className="field" style={{ flex: 1, minWidth: 180 }}><label>Loại chi phí *</label><input name="costType" required defaultValue={editing?.costType ?? ""} key={`t-${editing?.id ?? "new"}`} /></div>
              <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Mô tả</label><input name="description" defaultValue={editing?.description ?? ""} key={`d-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Số tiền (VNĐ)</label><input type="number" name="amount" defaultValue={editing?.amount ?? ""} key={`a-${editing?.id ?? "new"}`} /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn-pri" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm"}</button>
              <button type="button" className="btn-line" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="rz-table" id="qtv-table">
          <thead>
            <tr>
              {editMode && (
                <th style={{ width: 32 }}>
                  <input type="checkbox" className="selall-chk" checked={items.length > 0 && items.every((r) => selected.includes(r.id))} onChange={(e) => setSelected(e.target.checked ? items.map((r) => r.id) : [])} />
                </th>
              )}
              <th>Số thứ tự</th><th>Loại chi phí</th><th>Mô tả</th><th>Số tiền (VNĐ)</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="qtv-body">
            {items.map((r, idx) => (
              <tr key={r.id}>
                {editMode && <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>}
                <td>{idx + 1}</td>
                <td>{r.costType}</td>
                <td>{r.description ?? "—"}</td>
                <td>{fmtVnd(r.amount ?? 0)}</td>
                <td><button className="btn-line" onClick={() => openEdit(r)}>Sửa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty" id="qtv-empty">Chưa có chi phí biến đổi nào.</div>}
      </div>
    </section>
  )
}
