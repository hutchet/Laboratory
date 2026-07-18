"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { saveEquipment, deleteEquipment, deleteManyEquipment } from "./actions"
import { useEscapeClose } from "@/lib/useEscapeClose"
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
      },
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
    if (!confirm("Xoa thiet bi nay?")) return
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
    if (!confirm(`Xoa ${selected.size} thiet bi da chon?`)) return
    startTransition(async () => { await deleteManyEquipment(Array.from(selected)); setSelected(new Set()) })
  }

  return (
    <section id="page-equipment">
      <div className="grid kpis" id="eq-overview-analytics">
        <div className="kcard"><div className="l">Tong thiet bi</div><div className="v">{total}</div></div>
        <div className="kcard"><div className="l">San sang</div><div className="v">{ready}</div></div>
        <div className="kcard"><div className="l">Can kiem dinh som</div><div className="v">{soon}</div></div>
        <div className="kcard"><div className="l">Qua han kiem dinh</div><div className="v">{overdue}</div></div>
      </div>

      <div className="section-head" style={{ display: "flex", gap: 8 }}>
        <button className="btn-pri" id="eq-add-global" onClick={() => { setEditing(null); setShowForm(true) }}>+ Them thiet bi</button>
        {canManage && <button className={editMode ? "btn-success" : "btn-line"} id="eq-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected(new Set()) }}>{editMode ? "Xong" : "Chinh sua"}</button>}
        {canManage && editMode && (
          <button className="btn-danger" id="eq-bulk-del" disabled={!selected.size} onClick={onBulkDelete}>Xoa da chon (<span id="eq-bulk-count">{selected.size}</span>)</button>
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
              <h3 id="eq-form-title">{editing ? "Sua thiet bi" : "Them thiet bi"}</h3>
              <button type="button" className="modal-x eq-popup-close" id="eq-popup-close" aria-label="Dong" onClick={() => { setShowForm(false); setEditing(null) }}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div className="form-error" role="alert" style={{ color: "#c0392b", marginBottom: 8 }}>{formError}</div>}
              <form action={onSubmit}>
                <div className="row">
                  <div className="field">
                    <label>Ten thiet bi</label>
                    <input name="name" defaultValue={editing?.name ?? ""} required />
                  </div>
                  <div className="field"><label>Ma thiet bi</label><input name="code" defaultValue={editing?.code ?? ""} /></div>
                  <div className="field">
                    <label>Loai</label>
                    <input name="category" list="eq-cat-list" defaultValue={editing?.category ?? ""} />
                    <datalist id="eq-cat-list">{categories.map((c) => (<option key={c} value={c} />))}</datalist>
                  </div>
                </div>
                <div className="row">
                  <div className="field"><label>Hang san xuat</label><input name="manufacturer" defaultValue={editing?.manufacturer ?? ""} /></div>
                  <div className="field"><label>Model</label><input name="model" defaultValue={editing?.model ?? ""} /></div>
                  <div className="field"><label>So luong</label><input type="number" name="qty" defaultValue={editing?.qty ?? ""} /></div>
                </div>
                <div className="row">
                  <div className="field">
                    <label>Trang thai</label>
                    <CustomSelect name="status" defaultValue={editing?.status ?? "ready"} options={[{ value: "ready", label: "San sang" }, { value: "in_use", label: "Dang dung" }, { value: "maintenance", label: "Bao tri" }]} />
                  </div>
                  <div className="field">
                    <label>Trung tam *</label>
                    <CustomSelect name="centerId" defaultValue={editing?.centerId ?? ""} options={[{ value: "", label: "-- Khong --" }, ...centers.map((c) => ({ value: c.id, label: c.name }))]} />
                  </div>
                  <div className="field"><label>Phong</label><input name="room" defaultValue={editing?.room ?? ""} /></div>
                </div>
                <div className="row">
                  <div className="field"><label>Dien tich (m2)</label><input type="number" name="area" defaultValue={editing?.area ?? ""} /></div>
                  <div className="field"><label>Cong suat (kW)</label><input type="number" name="power" defaultValue={editing?.power ?? ""} /></div>
                  <div className="field"><label>Thong so</label><input name="spec" defaultValue={editing?.spec ?? ""} /></div>
                </div>
                <div className="row">
                  <div className="field"><label>Hieu chuan lan cuoi</label><input type="date" name="calLast" defaultValue={editing?.calLast ? editing.calLast.slice(0, 10) : ""} /></div>
                  <div className="field"><label>Chu ky (thang)</label><input type="number" name="calInterval" defaultValue={editing?.calInterval ?? ""} /></div>
                  <div className="field"><label>So chung nhan</label><input name="calCert" defaultValue={editing?.calCert ?? ""} /></div>
                  <div className="field"><label>Don vi hieu chuan</label><input name="calVendor" defaultValue={editing?.calVendor ?? ""} /></div>
                </div>
                <div className="row">
                  {canManage && <button className="btn-pri" type="submit" disabled={pending}>Luu</button>}
                  <button className="btn-line" type="button" onClick={() => { setShowForm(false); setEditing(null) }}>Huy</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="chips" id="eq-center-cards">
        <button className={activeCenter === "all" ? "chip active" : "chip"} onClick={() => setActiveCenter("all")}>Tat ca ({total})</button>
        {centers.map((c) => (
          <button key={c.id} className={activeCenter === c.id ? "chip active" : "chip"} onClick={() => setActiveCenter(c.id)}>
            {c.name} ({(byCenter[c.id] ?? []).length})
          </button>
        ))}
      </div>

      <table ref={tableRef} id="eq-mgmt-table">
        <thead>
          <tr>{editMode && <th><input type="checkbox" className="selall-chk" data-tbl="eq" checked={selected.size === shown.length && shown.length > 0} onChange={toggleAll} aria-label="Chon tat ca" /></th>}<th>Ten</th><th>Ma</th><th>Loai</th><th>Trung tam</th><th>Trang thai</th><th>Han hieu chuan</th><th>Thao tac</th></tr>
        </thead>
        <tbody id="eq-mgmt-body">
          {shown.map((e) => (
            <tr key={e.id}>
              {editMode && <td><input type="checkbox" className="row-chk" data-tbl="eq" data-key={e.id} checked={selected.has(e.id)} onChange={() => toggleRow(e.id)} /></td>}
              <td>{e.name}</td>
              <td>{e.code ?? "-"}</td>
              <td>{e.category ?? "-"}</td>
              <td>{e.centerName}</td>
              <td>{e.status === "ready" ? "San sang" : e.status === "in_use" ? "Dang dung" : "Bao tri"}</td>
              <td>{e.calDueLabel === "overdue" ? "Qua han" : e.calDueLabel === "soon" ? "Sap toi" : e.calDueLabel === "ok" ? "Con han" : "-"}</td>
              <td>
                <button className="btn-line" onClick={() => { setEditing(e); setShowForm(true) }}>Sua</button>
                <button className="btn-line" onClick={() => onDelete(e.id)}>Xoa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {shown.length === 0 && <div id="eq-mgmt-empty" className="empty">Chua co thiet bi nao.</div>}
    </section>
  )
}
