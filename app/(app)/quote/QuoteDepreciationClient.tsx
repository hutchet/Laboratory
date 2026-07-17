"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { saveDepreciationAsset, deleteDepreciationAssets } from "./actions"
import { useColResize } from "./useColResize"

type Row = { id: string; assetName: string; assetGroup: string | null; totalValue: number | null; years: number | null }

function fmtVnd(n: number) { return n.toLocaleString("vi-VN") }
function hourlyRate(totalValue: number | null, years: number | null) {
  if (!totalValue || !years) return 0
  const hoursPerYear = 8 * 250 // gio lam viec / nam
  return totalValue / years / hoursPerYear
}

export default function QuoteDepreciationClient({ items, canManage = true }: { items: Row[]; canManage?: boolean }) {
  const [q, setQ] = useState("")
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()
  const tableRef = useRef<HTMLTableElement | null>(null)
  useColResize(tableRef, 7 + (editMode ? 1 : 0))

  const filtered = useMemo(() => items.filter((i) => !q || i.assetName.toLowerCase().includes(q.toLowerCase())), [items, q])

  function toggle(id: string) { setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) }
  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(r: Row) { setEditing(r); setShowForm(true) }
  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveDepreciationAsset(formData); setShowForm(false); setEditing(null) })
  }
  function bulkDelete() {
    if (selected.length === 0) return
    if (!confirm(`Xoá ${selected.length} thiết bị đã chọn?`)) return
    startTransition(async () => { await deleteDepreciationAssets(selected); setSelected([]) })
  }

  return (
    <section id="page-quote-depreciation">
      <div className="section-head">
        <h3>Khấu hao thiết bị (<span id="qtd-count">{items.length}</span>)</h3>
        <div className="tools">
          <div className="search" style={{ maxWidth: 260 }}>
            <input id="qtd-search" placeholder="Tìm thiết bị..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {canManage && <button className="btn-line" id="qtd-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected([]) }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>}
          {canManage && editMode && (
            <button className="btn-danger" id="qtd-bulk-del" disabled={selected.length === 0 || pending} onClick={bulkDelete}>Xoá đã chọn (<span id="qtd-bulk-count">{selected.length}</span>)</button>
          )}
          {canManage && <button className="btn-pri" id="qtd-add" onClick={openNew}>+ Thêm thiết bị</button>}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form action={onSubmit}>
            <input type="hidden" name="id" defaultValue={editing?.id ?? ""} />
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Tên thiết bị *</label><input name="assetName" required defaultValue={editing?.assetName ?? ""} key={`n-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Nhóm tài sản</label><input name="assetGroup" defaultValue={editing?.assetGroup ?? ""} key={`g-${editing?.id ?? "new"}`} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field"><label>Tổng giá trị (VNĐ)</label><input type="number" name="totalValue" defaultValue={editing?.totalValue ?? ""} key={`v-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Số năm khấu hao</label><input type="number" name="years" defaultValue={editing?.years ?? ""} key={`y-${editing?.id ?? "new"}`} /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn-pri" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm"}</button>
              <button type="button" className="btn-line" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div className="qs-box" id="qtd-scrollbox">
        <table className="rz-table" id="qtd-table" ref={tableRef}>
          <thead>
            <tr>
              {editMode && (
                <th style={{ width: 32 }}>
                  <input type="checkbox" className="selall-chk" checked={filtered.length > 0 && filtered.every((r) => selected.includes(r.id))} onChange={(e) => setSelected(e.target.checked ? filtered.map((r) => r.id) : [])} />
                </th>
              )}
              <th>Số thứ tự</th><th>Tên thiết bị</th><th>Nhóm tài sản</th><th>Tổng giá trị (VNĐ)</th><th>Số năm KH</th><th>Khấu hao/giờ (VNĐ)</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="qtd-body">
            {filtered.map((r, idx) => (
              <tr key={r.id}>
                {editMode && <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>}
                <td>{idx + 1}</td>
                <td>{r.assetName}</td>
                <td>{r.assetGroup ?? "—"}</td>
                <td>{fmtVnd(r.totalValue ?? 0)}</td>
                <td>{r.years ?? "—"}</td>
                <td>{fmtVnd(Math.round(hourlyRate(r.totalValue, r.years)))}</td>
                <td><button className="btn-line" onClick={() => openEdit(r)}>Sửa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && <div className="empty" id="qtd-empty">Chưa có thiết bị khấu hao nào.</div>}
      </div>
    </section>
  )
}
