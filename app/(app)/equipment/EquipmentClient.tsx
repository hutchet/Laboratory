"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { saveEquipment, deleteEquipment, deleteManyEquipment } from "./actions"
import { useEscapeClose } from "@/lib/useEscapeClose"
import { validateModalState, required, min } from "@/lib/validateModalState"
import { useColResize } from "../quote/useColResize"
import { CustomSelect } from "@/components/CustomSelect"

type Row = {
  id: string; name: string; code: string | null; category: string | null; manufacturer: string | null; model: string | null
  qty: number | null; status: string | null; centerId: string | null; centerName: string; room: string | null; area: number | null
  power: number | null; spec: string | null; calLast: string | null; calInterval: number | null; calCert: string | null; calVendor: string | null
  calDueLabel: string
}
type Option = { id: string; name: string }

export default function EquipmentClient({ equipment, centers, canManage = true }: { equipment: Row[]; centers: Option[]; canManage?: boolean }) {
  const [activeCenter, setActiveCenter] = useState<string>("all")
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  useEscapeClose(showForm, () => { setShowForm(false); setEditing(null) })
  const [pending, startTransition] = useTransition()
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [formError, setFormError] = useState<string | null>(null)

  const total = equipment.length
  const ready = equipment.filter((e) => e.status === "ready").length
  const soon = equipment.filter((e) => e.calDueLabel === "soon").length
  const overdue = equipment.filter((e) => e.calDueLabel === "overdue").length

  const byCenter = useMemo(() => {
    const map: Record<string, Row[]> = {}
    for (const e of equipment) {
      const key = e.centerId ?? "none"
      if (!map[key]) map[key] = []
      map[key].push(e)
    }
    return map
  }, [equipment])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const e of equipment) { if (e.category) set.add(e.category) }
    return Array.from(set).sort()
  }, [equipment])

  const shown = activeCenter === "all" ? equipment : (byCenter[activeCenter] ?? [])
  const tableRef = useRef<HTMLTableElement>(null)
  useColResize(tableRef, 7 + (editMode ? 1 : 0))

  function onSubmit(formData: FormData) {
    const check = validateModalState(
      { name: formData.get("name"), qty: formData.get("qty"), area: formData.get("area"), power: formData.get("power"), calInterval: formData.get("calInterval") },
      {
        name: [required("Ten thiet bi khong duoc de trong")],
        qty: [min(0, "So luong khong duoc am")],
        area: [min(0, "Dien tich khong duoc am")],
        power: [min(0, "Cong suat khong duoc am")],
        calInterval: [min(0, "Chu ky hieu chuan khong duoc am")],
      } as any,
    )
    if (!check.valid) {
      setFormError(check.firstError)
      return
    }
    setFormError(null)
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveEquipment(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xóa thiết bị này?")) return
    startTransition(async () => { await deleteEquipment(id) })
  }
  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleAll() {
    setSelected((prev) => (prev.size === shown.length ? new Set() : new Set(shown.map((e) => e.id))))
  }
  function onBulkDelete() {
    if (!selected.size) return
    if (!confirm(`Xóa ${selected.size} thiết bị đã chọn?`)) return
    startTransition(async () => { await deleteManyEquipment(Array.from(selected)); setSelected(new Set()) })
  }

  return (
    <section id="page-equipment">
      <div className="grid kpis" id="eq-overview-analytics">
        <div className="kcard"><div className="l">Tổng thiết bị</div><div className="v">{total}</div></div>
        <div className="kcard"><div className="l">Sẵn sàng</div><div className="v">{ready}</div></div>
        <div className="kcard"><div className="l">Cần kiểm định sớm</div><div className="v">{soon}</div></div>
        <div className="kcard"><div className="l">Quá hạn kiểm định</div><div className="v">{overdue}</div></div>
      </div>

      <div className="section-head" style={{ display: "flex", gap: 8 }}>
        <button className="btn-pri" id="eq-add-global" onClick={() => { setEditing(null); setShowForm(true) }}>+ Thêm thiết bị</button>
        {canManage && <button className={editMode ? "btn-success" : "btn-line"} id="eq-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected(new Set()) }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>}
        {canManage && editMode && (
          <button className="btn-danger" id="eq-bulk-del" disabled={!selected.size} onClick={onBulkDelete}>Xóa đã chọn (<span id="eq-bulk-count">{selected.size}</span>)</button>
        )}
      </div>

      {showForm && (
        <div
          className="modal-overlay"
          id="eq-popup-layer"
          onMouseDown={(ev) => { if (ev.target === ev.currentTarget) { setShowForm(false); setEditing(null) } }}
        >
          <div className="modal" id="eq-form-card">
            <div className="modal-h eq-popup-head">
              <h3 id="eq-form-title">{editing ? "Sửa thiết bị" : "Thêm thiết bị"}</h3>
              <button type="button" className="modal-x eq-popup-close" id="eq-popup-close" aria-label="Đóng" onClick={() => { setShowForm(false); setEditing(null) }}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="form-error" role="alert" style={{ color: "#c0392b", marginBottom: 8 }}>{formError}</div>}
              <form action={onSubmit}>
                <div className="row">
                  <div className="field">
                    <label>Tên thiết bị</label>
                    <input name="name" defaultValue={editing?.name ?? ""} required />
                  </div>
                  <div className="field"><label>Mã thiết bị</label><input name="code" defaultValue={editing?.code ?? ""} /></div>
                  <div className="field">
                    <label>Danh mục</label>
                    <input name="category" list="eq-cat-list" defaultValue={editing?.category ?? ""} />
                    <datalist id="eq-cat-list">{categories.map((c) => (<option key={c} value={c} />))}</datalist>
                  </div>
                </div>
                <div className="row">
                  <div className="field"><label>Hãng sản xuất</label><input name="manufacturer" defaultValue={editing?.manufacturer ?? ""} /></div>
                  <div className="field"><label>Model</label><input name="model" defaultValue={editing?.model ?? ""} /></div>
                  <div className="field"><label>Số lượng</label><input type="number" name="qty" defaultValue={editing?.qty ?? ""} /></div>
                </div>
                <div className="row">
                  <div className="field">
                    <label>Trạng thái</label>
                    <CustomSelect name="status" defaultValue={editing?.status ?? "ready"} options={[{ value: "ready", label: "Sẵn sàng" }, { value: "in_use", label: "Đang dùng" }, { value: "maintenance", label: "Bảo trì" }]} />
                  </div>
                  <div className="field">
                    <label>Trung tâm *</label>
                    <CustomSelect name="centerId" defaultValue={editing?.centerId ?? ""} options={[{ value: "", label: "-- Không --" }, ...centers.map((c) => ({ value: c.id, label: c.name }))]} />
                  </div>
                  <div className="field"><label>Phòng thử</label><input name="room" defaultValue={editing?.room ?? ""} /></div>
                </div>
                <div className="row">
                  <div className="field"><label>Diện tích (m²)</label><input type="number" name="area" defaultValue={editing?.area ?? ""} /></div>
                  <div className="field"><label>Công suất (kW)</label><input type="number" name="power" defaultValue={editing?.power ?? ""} /></div>
                  <div className="field"><label>Thông số/Ghi chú</label><input name="spec" defaultValue={editing?.spec ?? ""} /></div>
                </div>
                <div className="row">
                  <div className="field"><label>Hiệu chuẩn gần nhất</label><input type="date" name="calLast" defaultValue={editing?.calLast ? editing.calLast.slice(0, 10) : ""} /></div>
                  <div className="field"><label>Chu kỳ (tháng)</label><input type="number" name="calInterval" defaultValue={editing?.calInterval ?? ""} /></div>
                  <div className="field"><label>Số chứng nhận</label><input name="calCert" defaultValue={editing?.calCert ?? ""} /></div>
                  <div className="field"><label>Đơn vị hiệu chuẩn</label><input name="calVendor" defaultValue={editing?.calVendor ?? ""} /></div>
                </div>
                <div className="row">
                  {canManage && <button className="btn-pri" type="submit" disabled={pending}>Lưu</button>}
                  <button className="btn-line" type="button" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="chips" id="eq-center-cards">
        <button className={activeCenter === "all" ? "chip active" : "chip"} onClick={() => setActiveCenter("all")}>Tất cả ({total})</button>
        {centers.map((c) => (
          <button key={c.id} className={activeCenter === c.id ? "chip active" : "chip"} onClick={() => setActiveCenter(c.id)}>
            {c.name} ({(byCenter[c.id] ?? []).length})
          </button>
        ))}
      </div>

      <div className="qs-box">
      <table ref={tableRef} id="eq-mgmt-table" className={`rz-table${editMode ? " tbl-editing" : ""}`}>
        <thead>
          <tr>
            {editMode && <th style={{width:34,textAlign:"center"}}><input type="checkbox" className="selall-chk" data-tbl="eq" checked={selected.size === shown.length && shown.length > 0} onChange={toggleAll} aria-label="Chọn tất cả" /></th>}
            <th style={{width:46,textAlign:"center"}}>STT</th>
            <th>Mã<span className="col-resizer" /></th>
            <th>Tên thiết bị<span className="col-resizer" /></th>
            <th>Danh mục<span className="col-resizer" /></th>
            <th>Hãng<span className="col-resizer" /></th>
            <th>Dòng máy<span className="col-resizer" /></th>
            <th>Phòng thử<span className="col-resizer" /></th>
            <th>Số lượng<span className="col-resizer" /></th>
            <th>Trạng thái<span className="col-resizer" /></th>
            <th>Hiệu chuẩn<span className="col-resizer" /></th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody id="eq-mgmt-body">
          {shown.map((e) => (
            <tr key={e.id}>
              {editMode && <td style={{width:34,textAlign:"center"}}><input type="checkbox" className="row-chk" data-tbl="eq" data-key={e.id} checked={selected.has(e.id)} onChange={() => toggleRow(e.id)} /></td>}
              <td style={{textAlign:"center"}}>{shown.indexOf(e)+1}</td>
              <td>{e.code ?? "-"}</td>
              <td><b>{e.name}</b></td>
              <td>{e.category ?? "-"}</td>
              <td>{e.manufacturer ?? "-"}</td>
              <td>{e.model ?? "-"}</td>
              <td>{e.room ?? "-"}</td>
              <td>{e.qty ?? 1}</td>
              <td>
                <span className={`tag2 ${
                  e.status === "ready" ? "st-done" :
                  e.status === "maintenance" ? "st-over" : "st-doing"
                }`}>
                  {e.status === "ready" ? "Sẵn sàng" : e.status === "in_use" ? "Đang dùng" : "Bảo trì"}
                </span>
              </td>
              <td className={e.calDueLabel === "overdue" ? "text-red" : e.calDueLabel === "soon" ? "text-amber" : ""}>
                {e.calDueLabel === "overdue" ? "⚠️ Quá hạn" : e.calDueLabel === "soon" ? "⏳ Sắp tới" : e.calDueLabel === "ok" ? "✅ Còn hạn" : "-"}
              </td>
              <td>
                <div className="acts">
                  <button className="icon-act pri" title="Sửa" onClick={() => { setEditing(e); setShowForm(true) }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button className="icon-act del" title="Xóa" onClick={() => onDelete(e.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {shown.length === 0 && <div id="eq-mgmt-empty" className="empty">Chưa có thiết bị nào.</div>}
    </section>
  )
}
