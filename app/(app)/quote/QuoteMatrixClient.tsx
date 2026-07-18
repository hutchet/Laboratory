"use client"

import { useRef, useState, useTransition } from "react"
import { updateEquipmentRate, clearEquipmentRates } from "./actions"
import { useColResize } from "@/lib/useColResize"

type Eq = { id: string; name: string; code: string | null; category: string | null; hourlyRate: number | null }
type CenterGroup = { id: string; name: string; equipment: Eq[] }

function fmtVnd(n: number) { return n.toLocaleString("vi-VN") }

export default function QuoteMatrixClient({ centers, canManage = true }: { centers: CenterGroup[]; canManage?: boolean }) {
  const [openCenter, setOpenCenter] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const tableRef = useRef<HTMLTableElement>(null)
  useColResize(tableRef, 6 + (editMode ? 1 : 0))

  const currentEq = centers.find((c) => c.id === openCenter)?.equipment ?? []

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(currentEq.map((e) => e.id)) : new Set())
  }
  function onBulkClearRates() {
    if (!selected.size) return
    if (!confirm(`Xóa đơn giá ${selected.size} mục đã chọn?`)) return
    const ids = Array.from(selected)
    startTransition(async () => {
      await clearEquipmentRates(ids)
      setSelected(new Set())
    })
  }

  const totalEquipment = centers.reduce((s, c) => s + c.equipment.length, 0)
  const totalPriced = centers.reduce((s, c) => s + c.equipment.filter((e) => e.hourlyRate != null).length, 0)

  function onSaveRate(formData: FormData) {
    startTransition(async () => { await updateEquipmentRate(formData) })
  }

  return (
    <section id="page-quote-matrix">
      <div id="qtm-overview-analytics" className="grid kpis" style={{ marginBottom: 20 }}>
        <div className="kcard kb"><div className="v">{centers.length}</div><div className="l">Trung tâm</div></div>
        <div className="kcard kp"><div className="v">{totalEquipment}</div><div className="l">Tổng thiết bị</div></div>
        <div className="kcard kg"><div className="v">{totalPriced}</div><div className="l">Đã có đơn giá</div></div>
        <div className="kcard kr"><div className="v">{totalEquipment - totalPriced}</div><div className="l">Chưa có đơn giá</div></div>
      </div>

      <div className="section-head"><h3>Đơn giá thiết bị theo trung tâm</h3></div>
      <div id="qtm-center-cards" className="cu-grid">
        {centers.map((c) => (
          <div className="cucard" key={c.id} onClick={() => setOpenCenter(openCenter === c.id ? null : c.id)} style={{ cursor: "pointer" }}>
            <div className="cucard-head">
              <div className="cucard-title"><h4>{c.name}</h4><div className="cu-sub">{c.equipment.length} thiết bị</div></div>
            </div>
            <div className="cucard-footer">
              <span>{c.equipment.filter((e) => e.hourlyRate != null).length}/{c.equipment.length} đã có đơn giá</span>
            </div>
          </div>
        ))}
      </div>
      {centers.length === 0 && <div className="empty" id="qtm-empty">Chưa có trung tâm / thiết bị nào.</div>}

      {openCenter && (
        <div id="qtm-center-detail" className="center-detail-section card" style={{ marginTop: 18, padding: 0, overflowX: "auto" }}>
          <div className="section-head" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>{centers.find((c) => c.id === openCenter)?.name} — đặt đơn giá thiết bị (VNĐ/giờ)</h3>
            {canManage && (
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className={editMode ? "btn-success" : "btn-line"} id="qtm-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected(new Set()) }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
                {editMode && (
                  <button type="button" className="btn-danger" id="qtm-bulk-del" disabled={!selected.size} onClick={onBulkClearRates}>Xóa mục đã chọn (<span id="qtm-bulk-count">{selected.size}</span>)</button>
                )}
              </div>
            )}
          </div>
          <table className={"rz-table" + (editMode ? " tbl-editing" : "")} id="qtm-table" ref={tableRef}>
            <thead><tr>{editMode && <th style={{ width: 34, textAlign: "center" }}><input type="checkbox" className="selall-chk" data-tbl="qtm" checked={currentEq.length > 0 && selected.size === currentEq.length} onChange={(ev) => toggleAll(ev.target.checked)} /></th>}<th>Số thứ tự</th><th>Mã</th><th>Tên thiết bị</th><th>Nhóm</th><th>Đơn giá (VNĐ/giờ)</th><th>Thao tác</th></tr></thead>
            <tbody id="qtm-body">
              {currentEq.map((e, idx) => (
                <tr key={e.id}>
                  {editMode && <td style={{ textAlign: "center" }}><input type="checkbox" className="row-chk" data-tbl="qtm" data-key={e.id} checked={selected.has(e.id)} onChange={() => toggleRow(e.id)} /></td>}
                  <td>{idx + 1}</td>
                  <td>{e.code ?? "—"}</td>
                  <td>{e.name}</td>
                  <td>{e.category ?? "—"}</td>
                  <td>{fmtVnd(e.hourlyRate ?? 0)}</td>
                  <td>
                    {canManage ? (
                      <form action={onSaveRate} style={{ display: "flex", gap: 6 }}>
                        <input type="hidden" name="id" defaultValue={e.id} />
                        <input type="number" name="hourlyRate" defaultValue={e.hourlyRate ?? ""} style={{ width: 110 }} />
                        <button type="submit" className="btn-line" disabled={pending}>Lưu</button>
                      </form>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
