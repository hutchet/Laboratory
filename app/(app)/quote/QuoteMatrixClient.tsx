"use client"

import { useState, useTransition } from "react"
import { updateEquipmentRate } from "./actions"

type Eq = { id: string; name: string; code: string | null; category: string | null; hourlyRate: number | null }
type CenterGroup = { id: string; name: string; equipment: Eq[] }

function fmtVnd(n: number) { return n.toLocaleString("vi-VN") }

export default function QuoteMatrixClient({ centers }: { centers: CenterGroup[] }) {
  const [openCenter, setOpenCenter] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

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
          <div className="section-head" style={{ padding: 16 }}>
            <h3>{centers.find((c) => c.id === openCenter)?.name} — đặt đơn giá thiết bị (VNĐ/giờ)</h3>
          </div>
          <table className="rz-table" id="qtm-table">
            <thead><tr><th>Số thứ tự</th><th>Mã</th><th>Tên thiết bị</th><th>Nhóm</th><th>Đơn giá (VNĐ/giờ)</th><th>Thao tác</th></tr></thead>
            <tbody id="qtm-body">
              {centers.find((c) => c.id === openCenter)?.equipment.map((e, idx) => (
                <tr key={e.id}>
                  <td>{idx + 1}</td>
                  <td>{e.code ?? "—"}</td>
                  <td>{e.name}</td>
                  <td>{e.category ?? "—"}</td>
                  <td>{fmtVnd(e.hourlyRate ?? 0)}</td>
                  <td>
                    <form action={onSaveRate} style={{ display: "flex", gap: 6 }}>
                      <input type="hidden" name="id" defaultValue={e.id} />
                      <input type="number" name="hourlyRate" defaultValue={e.hourlyRate ?? ""} style={{ width: 110 }} />
                      <button type="submit" className="btn-line" disabled={pending}>Lưu</button>
                    </form>
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
