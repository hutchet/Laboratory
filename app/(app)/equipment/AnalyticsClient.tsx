"use client"

import { useMemo, useState, useTransition } from "react"
import { createBooking, deleteBooking } from "./actions"
import { HeatmapChart } from "@/components/HeatmapChart"

type EquipRow = { id: string; name: string; category: string | null; status: string | null }
type Booking = {
  id: string; equipmentId: string; equipmentName: string; startTime: string; endTime: string
  bookedBy: string | null; department: string | null; purpose: string | null
}

const HOURS = Array.from({ length: 13 }, (_, i) => 7 + i) // 07:00 - 19:00

function fmtDate(d: Date) {
  const y = d.getFullYear(); const m = String(d.getMonth() + 1).padStart(2, "0"); const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fmtDateVN(s: string) {
  if (!s) return "—"
  const p = s.split("-")
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s
}

export default function AnalyticsClient({ equipment, bookings }: { equipment: EquipRow[]; bookings: Booking[] }) {
  const [date, setDate] = useState(() => fmtDate(new Date()))
  const [cat, setCat] = useState("all")
  const [pending, startTransition] = useTransition()
  const [slotPick, setSlotPick] = useState<{ equipmentId: string; hour: number } | null>(null)
  const [viewMode, setViewMode] = useState<"day" | "month" | "year">("day")

  const cats = useMemo(() => Array.from(new Set(equipment.map((e) => e.category).filter(Boolean))) as string[], [equipment])
  const equipShown = cat === "all" ? equipment : equipment.filter((e) => e.category === cat)

  const dayBookings = useMemo(() => bookings.filter((b) => b.startTime.slice(0, 10) === date), [bookings, date])

  const total = equipment.length
  const ready = equipment.filter((e) => e.status === "ready").length
  const maint = equipment.filter((e) => e.status === "maintenance").length
  const todayBookings = useMemo(() => bookings.filter((b) => b.startTime.slice(0, 10) === fmtDate(new Date())), [bookings])

  function bookingFor(equipmentId: string, hour: number) {
    return dayBookings.find((b) => {
      if (b.equipmentId !== equipmentId) return false
      const sh = new Date(b.startTime).getHours()
      const eh = new Date(b.endTime).getHours()
      return hour >= sh && hour < eh
    })
  }

  function shiftDate(deltaDays: number) {
    const d = new Date(date)
    if (viewMode === "day") d.setDate(d.getDate() + deltaDays)
    else if (viewMode === "month") d.setMonth(d.getMonth() + deltaDays)
    else d.setFullYear(d.getFullYear() + deltaDays)
    setDate(fmtDate(d))
  }

  const bookingCountByDay = useMemo(() => {
    const map: Record<string, number> = {}
    bookings.forEach((b) => { const k = b.startTime.slice(0, 10); map[k] = (map[k] ?? 0) + 1 })
    return map
  }, [bookings])

  const last7Days = useMemo(() => {
    const days: string[] = []
    const base = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base)
      d.setDate(d.getDate() - i)
      days.push(fmtDate(d))
    }
    return days
  }, [])
  const last7DayLabels = useMemo(
    () => last7Days.map((d) => { const dt = new Date(d); return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}` }),
    [last7Days],
  )
  const equipmentIdToCategory = useMemo(() => {
    const map: Record<string, string> = {}
    equipment.forEach((e) => { map[e.id] = e.category || "Khác" })
    return map
  }, [equipment])
  const categoryHeatmapRows = useMemo(() => Array.from(new Set(equipment.map((e) => e.category || "Khác"))), [equipment])
  const categoryHeatmapCells = useMemo(() => {
    const counts: Record<string, number> = {}
    bookings.forEach((b) => {
      const day = b.startTime.slice(0, 10)
      if (!last7Days.includes(day)) return
      const category = equipmentIdToCategory[b.equipmentId] || "Khác"
      const dayLabel = last7DayLabels[last7Days.indexOf(day)]
      const key = `${category}__${dayLabel}`
      counts[key] = (counts[key] ?? 0) + 1
    })
    return categoryHeatmapRows.flatMap((row) =>
      last7DayLabels.map((colLabel) => ({ rowLabel: row, colLabel, value: counts[`${row}__${colLabel}`] ?? 0 })),
    )
  }, [bookings, equipmentIdToCategory, categoryHeatmapRows, last7Days, last7DayLabels])

  function monthMatrix(baseDate: Date) {
    const y = baseDate.getFullYear(); const m = baseDate.getMonth()
    const first = new Date(y, m, 1)
    const startOffset = (first.getDay() + 6) % 7 // Monday-first grid
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const cells: Array<{ dateStr: string | null; day: number | null }> = []
    for (let i = 0; i < startOffset; i++) cells.push({ dateStr: null, day: null })
    for (let d = 1; d <= daysInMonth; d++) cells.push({ dateStr: fmtDate(new Date(y, m, d)), day: d })
    while (cells.length % 7 !== 0) cells.push({ dateStr: null, day: null })
    return cells
  }

  function jumpToDay(d: string) { setDate(d); setViewMode("day") }
  function jumpToMonth(d: string) { setDate(d); setViewMode("month") }

  function onCreate(formData: FormData) {
    formData.set("date", date)
    startTransition(async () => { await createBooking(formData); setSlotPick(null) })
  }

  function onCancel(id: string) {
    if (!confirm("Hủy lịch đặt này?")) return
    startTransition(async () => { await deleteBooking(id) })
  }

  return (
    <section id="page-analytics">
      <div className="grid kpis" style={{ marginBottom: 18 }}>
        <div className="kcard kb"><div className="v" id="eqk-total">{total}</div><div className="l">Tổng thiết bị</div><div className="s">Trong danh mục</div></div>
        <div className="kcard kg"><div className="v" id="eqk-ready">{ready}</div><div className="l">Sẵn sàng</div><div className="s">Có thể đặt lịch</div></div>
        <div className="kcard kr"><div className="v" id="eqk-maint">{maint}</div><div className="l">Đang bảo trì</div><div className="s">Tạm ngưng đặt lịch</div></div>
        <div className="kcard kp"><div className="v" id="eqk-today">{todayBookings.length}</div><div className="l">Lượt đặt trong ngày</div><div className="s" id="eqk-today-s">{fmtDateVN(date)}</div></div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ch">
          <div className="ch-l">
            <h3>Tình trạng thiết bị theo nhóm (7 ngày qua)</h3>
          </div>
        </div>
        <HeatmapChart
          rowLabels={categoryHeatmapRows}
          colLabels={last7DayLabels}
          cells={categoryHeatmapCells}
          emptyLabel="Chưa có nhóm thiết bị nào."
        />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="ch" style={{ flexWrap: "wrap" }}>
          <div>
            <h3>Lịch đặt thiết bị theo khung giờ</h3>
            <span>Bấm khung giờ còn trống để đặt. Khung giờ đã có người đặt sẽ không thể chọn lại — hãy chọn giờ khác hoặc ngày khác.</span>
          </div>
        </div>
        <div className="eqdatenav">
          <button className="btn-line" id="eq-date-prev" onClick={() => shiftDate(-1)}>‹</button>
          <span className="eqdatenav-pick">
            {viewMode === "day" && (
              <input id="eq-date-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            )}
            {viewMode === "month" && (
              <input id="eq-month-input" type="month" value={date.slice(0, 7)} onChange={(e) => e.target.value && setDate(`${e.target.value}-01`)} />
            )}
            {viewMode === "year" && (
              <input id="eq-year-input" type="text" readOnly aria-label="Năm đang xem" value={date.slice(0, 4)} />
            )}
          </span>
          <button className="btn-line" id="eq-date-next" onClick={() => shiftDate(1)}>›</button>
          <button className="btn-line" id="eq-date-today" onClick={() => { setDate(fmtDate(new Date())); setViewMode("day") }}>Hôm nay</button>
          <div className="pl-zoom" id="eq-view-zoom">
            {([["day", "Ngày"], ["month", "Tháng"], ["year", "Năm"]] as const).map(([v, label]) => (
              <button key={v} className={viewMode === v ? "active" : ""} onClick={() => setViewMode(v)}>{label}</button>
            ))}
          </div>
        </div>

        <div className="chips" id="eq-cat-chips" style={{ margin: "10px 0" }}>
          <button className={cat === "all" ? "chip active" : "chip"} onClick={() => setCat("all")}>Tất cả</button>
          {cats.map((c) => (<button key={c} className={cat === c ? "chip active" : "chip"} onClick={() => setCat(c)}>{c}</button>))}
        </div>

        <div className="eqlegend">
          <div className="li"><span className="sw" style={{ background: "transparent" }} />Còn trống</div>
          <div className="li"><span className="sw" style={{ background: "var(--amber-soft)", borderLeft: "3px solid var(--amber)" }} />Đã đặt</div>
          <div className="li"><span className="sw eqcol-maint" />Đang bảo trì</div>
        </div>

        <div className="eqgrid-wrap" id="eq-grid-wrap">
          {viewMode === "day" && (
          <table className="eqgrid">
            <thead>
              <tr><th>Thiết bị</th>{HOURS.map((h) => (<th key={h}>{h}:00</th>))}</tr>
            </thead>
            <tbody>
              {equipShown.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  {HOURS.map((h) => {
                    const b = bookingFor(e.id, h)
                    if (e.status === "maintenance") return <td key={h} className="eqcol-maint" title="Đang bảo trì" />
                    if (b) return (
                      <td key={h} style={{ background: "var(--amber-soft)", borderLeft: "3px solid var(--amber)", padding: "4px 6px" }} title={`${b.bookedBy ?? ""} - ${b.purpose ?? ""}`}>
                        <b style={{ fontSize: 11.5 }}>{b.bookedBy ?? ""}</b>
                      </td>
                    )
                    return (
                      <td key={h} className="eqslot-empty" onClick={() => setSlotPick({ equipmentId: e.id, hour: h })}>
                        {slotPick && slotPick.equipmentId === e.id && slotPick.hour === h ? "✎" : ""}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          )}

          {viewMode === "month" && (
            <div id="eq-grid-month">
              <div className="pl-cal-head">
                {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (<div key={d} className="pl-cal-h">{d}</div>))}
              </div>
              <div className="pl-cal-grid">
                {monthMatrix(new Date(date)).map((c, i) => {
                  const count = c.dateStr ? (bookingCountByDay[c.dateStr] ?? 0) : 0
                  const isToday = c.dateStr === fmtDate(new Date())
                  return (
                    <div key={i} className={`pl-cal-cell${c.dateStr ? "" : " empty"}${isToday ? " today" : ""}`} onClick={() => c.dateStr && jumpToDay(c.dateStr)} data-jump-day={c.dateStr ?? undefined}>
                      {c.day && (<><div className="pl-cal-day">{c.day}</div>{count > 0 && <div className="pl-cal-count">{count} lịch</div>}</>)}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {viewMode === "year" && (
            <div id="eq-grid-year" className="pl-cal-year-grid">
              {Array.from({ length: 12 }, (_, m) => m).map((m) => {
                const y = new Date(date).getFullYear()
                const monthStr = `${y}-${String(m + 1).padStart(2, "0")}-01`
                const count = bookings.filter((b) => b.startTime.slice(0, 7) === `${y}-${String(m + 1).padStart(2, "0")}`).length
                return (
                  <div key={m} className="pl-cal-month-cell" onClick={() => jumpToMonth(monthStr)} data-jump-month={monthStr}>
                    <div className="pl-cal-month-name">Tháng {m + 1}</div>
                    {count > 0 && <div className="pl-cal-count">{count} lịch</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {slotPick && (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3>Đặt lịch: {equipment.find((e) => e.id === slotPick.equipmentId)?.name}</h3>
          <form action={onCreate}>
            <input type="hidden" name="equipmentId" value={slotPick.equipmentId} />
            <div className="row">
              <div className="field"><label>Giờ bắt đầu</label><input name="startHour" type="time" defaultValue={`${String(slotPick.hour).padStart(2, "0")}:00`} /></div>
              <div className="field"><label>Giờ kết thúc</label><input name="endHour" type="time" defaultValue={`${String(slotPick.hour + 1).padStart(2, "0")}:00`} /></div>
              <div className="field"><label>Người đặt</label><input name="bookedBy" placeholder="Họ tên" /></div>
              <div className="field"><label>Phòng ban</label><input name="department" placeholder="VD: QC" /></div>
              <div className="field" style={{ flex: 2 }}><label>Mục đích</label><input name="purpose" placeholder="Mục đích sử d���ng" /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button type="submit" className="btn-pri" disabled={pending}>Xác nhận đặt lịch</button>
              <button type="button" className="btn-line" onClick={() => setSlotPick(null)}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ padding: "0 0 4px" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Danh sách lượt đặt trong ngày</h3>
          <span style={{ fontSize: 12, color: "var(--muted)" }} id="eq-list-sub">{fmtDateVN(date)}</span>
        </div>
        <table>
          <thead><tr><th>Khung giờ</th><th>Thiết bị</th><th>Người đặt</th><th>Phòng ban</th><th>Mục đích</th><th>Thao tác</th></tr></thead>
          <tbody id="eq-booking-body">
            {dayBookings.map((b) => (
              <tr key={b.id}>
                <td>{new Date(b.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - {new Date(b.endTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</td>
                <td>{b.equipmentName}</td>
                <td>{b.bookedBy ?? "-"}</td>
                <td>{b.department ?? "-"}</td>
                <td>{b.purpose ?? "-"}</td>
                <td><button className="btn-line" onClick={() => onCancel(b.id)}>Hủy</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {dayBookings.length === 0 && <div id="eq-booking-empty" className="empty">Chưa có lượt đặt nào trong ngày này.</div>}
      </div>
    </section>
  )
}
