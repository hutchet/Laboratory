"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { savePurchase, deletePurchase, deleteAllPurchase, deleteManyPurchase } from "./actions"
import { useColResize } from "@/lib/useColResize"

type Item = { id: string; name: string; quantity: number | null; cost: number | null; status: string | null; note: string | null }

function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN")
}

function statusLabel(s: string | null) {
  if (s === "done") return "Hoàn thành"
  if (s === "ongoing") return "Đang triển khai"
  return "Chưa bắt đầu"
}

export default function PurchaseClient({ items, canManage = true }: { items: Item[]; canManage?: boolean }) {
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const tableRef = useRef<HTMLTableElement>(null)
  useColResize(tableRef, 7 + (editMode ? 1 : 0))

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === items.length ? new Set() : new Set(items.map((it) => it.id))))
  }
  function onBulkDelete() {
    if (!selected.size) return
    if (!confirm(`Xóa ${selected.size} hạng mục đã chọn?`)) return
    const ids = Array.from(selected)
    startTransition(async () => { await deleteManyPurchase(ids); setSelected(new Set()) })
  }

  const total = items.length
  const totalValue = useMemo(() => items.reduce((sum, it) => sum + (it.cost ?? 0) * (it.quantity ?? 1), 0), [items])
  const ongoing = items.filter((i) => i.status === "ongoing").length
  const done = items.filter((i) => i.status === "done").length

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await savePurchase(formData); setShowForm(false); setEditing(null) })
  }
  function onDelete(id: string) {
    if (!confirm("Xóa hạng mục mua hàng này?")) return
    startTransition(async () => { await deletePurchase(id) })
  }
  function onDeleteAll() {
    if (!confirm("Xóa toàn bộ hạng mục mua hàng? Không thể hoàn tác.")) return
    startTransition(async () => { await deleteAllPurchase() })
  }

  return (
    <section id="page-purchase">
      <div className="grid kpis" style={{ marginBottom: 16 }}>
        <div className="kcard kb"><div className="v" id="pm-k-total">{total}</div><div className="l">Tổng hạng mục</div><div className="s">Toàn bộ hạng mục mua hàng theo dõi</div></div>
        <div className="kcard kg"><div className="v" id="pm-k-value">{fmtVnd(totalValue)}</div><div className="l">Tổng giá trị (đ)</div><div className="s">Tổng hợp giá trị các hạng mục</div></div>
        <div className="kcard kp"><div className="v" id="pm-k-ongoing">{ongoing}</div><div className="l">Đang triển khai</div><div className="s">Trạng thái On-going</div></div>
        <div className="kcard kr"><div className="v" id="pm-k-done">{done}</div><div className="l">Hoàn thành</div><div className="s">Trạng thái Done</div></div>
      </div>

      <div id="pm-overview-wrap">
        <div className="card" style={{ marginBottom: 14 }}>
          <div id="pm-toolbar" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 12 }}>
            {canManage && <button className="btn-pri" id="pm-add-btn" onClick={() => { setEditing(null); setShowForm(true) }}>+ Thêm hạng mục</button>}
            {canManage && <button className={editMode ? "btn-success" : "btn-line"} id="pm-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected(new Set()) }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>}
            {canManage && editMode && (
              <button className="btn-danger" id="pm-bulk-del" disabled={!selected.size} onClick={onBulkDelete}>Xóa đã chọn (<span id="pm-bulk-count">{selected.size}</span>)</button>
            )}
            {canManage && <button className="btn-line" id="pm-delall-btn" style={{ color: "var(--red)" }} onClick={onDeleteAll}>Xóa toàn bộ</button>}
          </div>

          {showForm && (
            <div className="card" style={{ marginBottom: 14, background: "var(--bg)" }}>
              <form action={onSubmit}>
                <div className="row">
                  <div className="field" style={{ flex: 2 }}><label>Tên hạng mục</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
                  <div className="field"><label>Số lượng</label><input type="number" name="quantity" min={1} defaultValue={editing?.quantity ?? 1} /></div>
                  <div className="field"><label>Chi phí (đ/1 đơn vị)</label><input type="number" name="cost" min={0} defaultValue={editing?.cost ?? 0} /></div>
                  <div className="field">
                    <label>Trạng thái</label>
                    <select name="status" defaultValue={editing?.status ?? "ongoing"}>
                      <option value="todo">Chưa bắt đầu</option>
                      <option value="ongoing">Đang triển khai</option>
                      <option value="done">Hoàn thành</option>
                    </select>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <div className="field" style={{ flex: 1 }}><label>Ghi chú</label><input name="note" defaultValue={editing?.note ?? ""} /></div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button type="submit" className="btn-pri" disabled={pending}>{editing ? "Lưu" : "Thêm"}</button>
                  <button type="button" className="btn-line" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
                </div>
              </form>
            </div>
          )}

          <div id="pm-overview-grid">
            <table className="rz-table" ref={tableRef}>
              <thead><tr>{editMode && <th><input type="checkbox" className="selall-chk" data-tbl="pm" checked={selected.size === items.length && items.length > 0} onChange={toggleAll} aria-label="Chọn tất cả" /></th>}<th>Tên hạng mục</th><th>Số lượng</th><th>Chi phí (đ)</th><th>Thành tiền (đ)</th><th>Trạng thái</th><th>Ghi chú</th><th>Thao tác</th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    {editMode && <td><input type="checkbox" className="row-chk" data-tbl="pm" data-key={it.id} checked={selected.has(it.id)} onChange={() => toggleRow(it.id)} /></td>}
                    <td>{it.name}</td>
                    <td>{it.quantity ?? "-"}</td>
                    <td>{it.cost != null ? fmtVnd(it.cost) : "-"}</td>
                    <td>{it.cost != null ? fmtVnd(it.cost * (it.quantity ?? 1)) : "-"}</td>
                    <td>{statusLabel(it.status)}</td>
                    <td>{it.note ?? "-"}</td>
                    <td>
                      <button className="btn-line" onClick={() => { setEditing(it); setShowForm(true) }}>Sửa</button>
                      <button className="btn-line" onClick={() => onDelete(it.id)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && <div id="pm-empty" className="empty" style={{ padding: 32, textAlign: "center" }}>Chưa có hạng mục mua hàng. Nhấn <b>+ Thêm hạng mục</b> để bắt đầu.</div>}
        </div>
      </div>
    </section>
  )
}
