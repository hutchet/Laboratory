"use client"

import { useMemo, useState, useTransition } from "react"
import { saveEquipment, deleteEquipment } from "./actions"

type Row = {
  id: string; name: string; code: string | null; category: string | null; manufacturer: string | null; model: string | null
  qty: number | null; status: string | null; centerId: string | null; centerName: string; room: string | null; area: number | null
  power: number | null; spec: string | null; calLast: string | null; calInterval: number | null; calCert: string | null; calVendor: string | null
  calDueLabel: string
}
type Option = { id: string; name: string }

export default function EquipmentClient({ equipment, centers }: { equipment: Row[]; centers: Option[] }) {
  const [activeCenter, setActiveCenter] = useState<string>("all")
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

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

  const shown = activeCenter === "all" ? equipment : (byCenter[activeCenter] ?? [])

  function onSubmit(formData: FormData) {
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

  return (
    <section id="page-equipment">
      <div className="grid kpis" id="eq-overview-analytics">
        <div className="kcard"><div className="l">Tong thiet bi</div><div className="v">{total}</div></div>
        <div className="kcard"><div className="l">San sang</div><div className="v">{ready}</div></div>
        <div className="kcard"><div className="l">Can kiem dinh som</div><div className="v">{soon}</div></div>
        <div className="kcard"><div className="l">Qua han kiem dinh</div><div className="v">{overdue}</div></div>
      </div>

      <div className="section-head">
        <button className="btn-pri" id="eq-add-global" onClick={() => { setEditing(null); setShowForm(true) }}>+ Them thiet bi</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Ten thiet bi</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field"><label>Ma thiet bi</label><input name="code" defaultValue={editing?.code ?? ""} /></div>
              <div className="field"><label>Loai</label><input name="category" defaultValue={editing?.category ?? ""} /></div>
            </div>
            <div className="row">
              <div className="field"><label>Hang san xuat</label><input name="manufacturer" defaultValue={editing?.manufacturer ?? ""} /></div>
              <div className="field"><label>Model</label><input name="model" defaultValue={editing?.model ?? ""} /></div>
              <div className="field"><label>So luong</label><input type="number" name="qty" defaultValue={editing?.qty ?? ""} /></div>
            </div>
            <div className="row">
              <div className="field">
                <label>Trang thai</label>
                <select name="status" defaultValue={editing?.status ?? "ready"}>
                  <option value="ready">San sang</option>
                  <option value="in_use">Dang dung</option>
                  <option value="maintenance">Bao tri</option>
                </select>
              </div>
              <div className="field">
                <label>Trung tam</label>
                <select name="centerId" defaultValue={editing?.centerId ?? ""}>
                  <option value="">-- Khong --</option>
                  {centers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
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
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
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

      <table id="eq-mgmt-table">
        <thead>
          <tr><th>Ten</th><th>Ma</th><th>Loai</th><th>Trung tam</th><th>Trang thai</th><th>Han hieu chuan</th><th>Thao tac</th></tr>
        </thead>
        <tbody id="eq-mgmt-body">
          {shown.map((e) => (
            <tr key={e.id}>
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
