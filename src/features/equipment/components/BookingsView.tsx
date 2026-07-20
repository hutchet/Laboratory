"use client"
import { useMemo, useState, useTransition, type CSSProperties } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { KpiCard } from "@/shared/ui/kpi-card"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { saveBooking, deleteBooking } from "../actions"
import type { BookingRow, EquipmentRow, Option } from "../types"

type ViewMode = "day" | "month" | "year"

const SLOT_START = 7 * 60
const SLOT_END = 19 * 60
const SLOT_STEP = 30
const EQ_PALETTE = ["#4f6cf7", "#7c3aed", "#0891b2", "#db2777", "#16a34a", "#ea580c", "#0d9488", "#9333ea"]
const MONTH_LABELS = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"]

function pad(n: number) { return String(n).padStart(2, "0") }
function todayIso() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function dateStr(iso: string) { const d = new Date(iso); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function timeStr(iso: string) { const d = new Date(iso); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
function minOfDay(iso: string) { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes() }
function minToTime(m: number) { return `${pad(Math.floor(m / 60))}:${pad(m % 60)}` }
function fmtVN(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return `${pad(d)}/${pad(m)}/${y}`
}
function shiftDate(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}
function shiftMonth(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1 + months, d)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}
function shiftYear(iso: string, years: number) {
  const [y, m, d] = iso.split("-").map(Number)
  return `${y + years}-${pad(m)}-${pad(d)}`
}

type SlotPrefill = { equipmentId: string; startTime: string; endTime: string } | null

export function BookingsView({
  bookings,
  equipment,
  centers,
}: {
  bookings: BookingRow[]
  equipment: EquipmentRow[]
  centers: Option[]
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("day")
  const [selectedDate, setSelectedDate] = useState<string>(todayIso())
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [editing, setEditing] = useState<BookingRow | null>(null)
  const [slotPrefill, setSlotPrefill] = useState<SlotPrefill>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const categories = useMemo(() => {
    const set = new Set<string>()
    equipment.forEach((e) => { if (e.category) set.add(e.category) })
    return Array.from(set).sort()
  }, [equipment])

  const visibleEquipment = useMemo(
    () => (activeCategory === "all" ? equipment : equipment.filter((e) => e.category === activeCategory)),
    [equipment, activeCategory]
  )

  const todaysBookings = useMemo(
    () => bookings.filter((b) => dateStr(b.startTime) === selectedDate).sort((a, b) => minOfDay(a.startTime) - minOfDay(b.startTime)),
    [bookings, selectedDate]
  )

  function openNew() { setEditing(null); setSlotPrefill(null); setShowForm(true) }
  function openEdit(b: BookingRow) { setEditing(b); setSlotPrefill(null); setShowForm(true) }
  function openSlot(equipmentId: string, startMin: number) {
    const start = `${selectedDate}T${minToTime(startMin)}`
    const end = `${selectedDate}T${minToTime(Math.min(startMin + SLOT_STEP, SLOT_END))}`
    setEditing(null)
    setSlotPrefill({ equipmentId, startTime: start, endTime: end })
    setShowForm(true)
  }
  function jumpToDay(day: string) { setSelectedDate(day); setViewMode("day") }
  function jumpToMonth(monthIso: string) { setSelectedDate(monthIso); setViewMode("month") }

  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      equipmentId: String(formData.get("equipmentId") || ""),
      centerId: String(formData.get("centerId") || "") || null,
      startTime: String(formData.get("startTime") || ""),
      endTime: String(formData.get("endTime") || ""),
      bookedBy: String(formData.get("bookedBy") || ""),
      department: String(formData.get("department") || ""),
      purpose: String(formData.get("purpose") || ""),
    }
    startTransition(async () => { await saveBooking(input); setShowForm(false); setEditing(null); setSlotPrefill(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteBooking(id); setConfirmDeleteId(null) })
  }

  function goPrev() {
    if (viewMode === "day") setSelectedDate(shiftDate(selectedDate, -1))
    else if (viewMode === "month") setSelectedDate(shiftMonth(selectedDate, -1))
    else setSelectedDate(shiftYear(selectedDate, -1))
  }
  function goNext() {
    if (viewMode === "day") setSelectedDate(shiftDate(selectedDate, 1))
    else if (viewMode === "month") setSelectedDate(shiftMonth(selectedDate, 1))
    else setSelectedDate(shiftYear(selectedDate, 1))
  }

  const totalCount = equipment.length
  const readyCount = equipment.filter((e) => e.status === "active").length
  const maintCount = equipment.filter((e) => e.status === "maintenance").length

  return (
    <PageShell
      title="Đặt lịch thiết bị"
      actions={<button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Đặt lịch</button>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Tổng thiết bị" value={totalCount} hint="Trong danh mục" />
        <KpiCard label="Sẵn sàng" value={readyCount} hint="Có thể đặt lịch" tone="success" />
        <KpiCard label="Đang bảo trì" value={maintCount} hint="Tạm ngưng đặt lịch" tone="danger" />
        <KpiCard label="Lượt đặt trong ngày" value={todaysBookings.length} hint={fmtVN(selectedDate)} tone="warning" />
      </div>

      <div style={{ border: "1px solid #e2e5e9", borderRadius: 12, background: "#fff", padding: 16, marginBottom: 18 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Lịch đặt thiết bị theo khung giờ</h3>
          <span style={{ fontSize: 12, color: "#6b7280" }}>Bấm khung giờ còn trống để đặt. Khung giờ đã có người đặt sẽ không thể chọn lại — hãy chọn giờ khác hoặc ngày khác.</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button type="button" onClick={goPrev} style={navBtnStyle}>‹</button>
          {viewMode === "day" && (
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={inputStyle} />
          )}
          {viewMode === "month" && (
            <input type="month" value={selectedDate.slice(0, 7)} onChange={(e) => setSelectedDate(`${e.target.value}-01`)} style={inputStyle} />
          )}
          {viewMode === "year" && (
            <input type="text" readOnly value={selectedDate.slice(0, 4)} style={inputStyle} aria-label="Năm đang xem" />
          )}
          <button type="button" onClick={goNext} style={navBtnStyle}>›</button>
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {([["day", "Ngày"], ["month", "Tháng"], ["year", "Năm"]] as Array<[ViewMode, string]>).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewMode(v)}
                style={{ ...navBtnStyle, background: viewMode === v ? "#1d5fd6" : "#fff", color: viewMode === v ? "#fff" : "#111" }}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setSelectedDate(todayIso())} style={navBtnStyle}>Hôm nay</button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {["all", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCategory(c)}
              style={{
                padding: "4px 12px", borderRadius: 999, fontSize: 12, border: "1px solid #dfe3e8", cursor: "pointer",
                background: activeCategory === c ? "#1d5fd6" : "#fff",
                color: activeCategory === c ? "#fff" : "#111",
              }}
            >
              {c === "all" ? "Tất cả" : c}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
          <span><span style={legendSwatch("transparent", "#dfe3e8")} />Còn trống</span>
          <span><span style={legendSwatch("#fdecc8", "#f59e0b")} />Đã đặt</span>
          <span><span style={legendSwatch("#f3f4f6", "#9ca3af")} />Đang bảo trì</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          {viewMode === "day" && (
            <DayGrid equipment={visibleEquipment} bookings={bookings} selectedDate={selectedDate} onSlotClick={openSlot} />
          )}
          {viewMode === "month" && (
            <MonthGrid equipment={visibleEquipment} bookings={bookings} monthIso={selectedDate} onDayClick={jumpToDay} />
          )}
          {viewMode === "year" && (
            <YearGrid equipment={visibleEquipment} bookings={bookings} yearIso={selectedDate} onMonthClick={jumpToMonth} />
          )}
        </div>
      </div>

      <div style={{ border: "1px solid #e2e5e9", borderRadius: 12, background: "#fff", overflowX: "auto" }}>
        <div style={{ padding: "20px 20px 0" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Danh sách lượt đặt trong ngày</h3>
          <span style={{ fontSize: 12, color: "#6b7280" }}>{fmtVN(selectedDate)}</span>
        </div>
        {todaysBookings.length === 0 ? (
          <div style={{ padding: 20, color: "#6b7280", fontSize: 13 }}>Chưa có lượt đặt nào trong ngày này.</div>
        ) : (
          <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 12, color: "#6b7280" }}>
                <th style={thStyle}>Khung giờ</th>
                <th style={thStyle}>Thiết bị</th>
                <th style={thStyle}>Người đặt</th>
                <th style={thStyle}>Phòng ban</th>
                <th style={thStyle}>Mục đích</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {todaysBookings.map((b) => (
                <tr key={b.id} style={{ borderTop: "1px solid #eef0f2", fontSize: 13 }}>
                  <td style={tdStyle}><span style={{ padding: "2px 8px", borderRadius: 999, background: "#f1f3f5" }}>{timeStr(b.startTime)}–{timeStr(b.endTime)}</span></td>
                  <td style={tdStyle}>{b.equipment?.name ?? "—"}</td>
                  <td style={tdStyle}>{b.bookedBy ?? "—"}</td>
                  <td style={tdStyle}>{b.department ?? "—"}</td>
                  <td style={tdStyle}>{b.purpose ?? "—"}</td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <button type="button" onClick={() => openEdit(b)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer", marginRight: 10 }}>Sửa</button>
                    <button type="button" onClick={() => setConfirmDeleteId(b.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Hủy</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FormModal
        open={showForm}
        title={editing ? "Sửa lịch đặt" : "Đặt lịch thiết bị"}
        onClose={() => { setShowForm(false); setEditing(null); setSlotPrefill(null); setFormError(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-booking-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
      >
        <form id="tf-booking-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {formError && (
            <div style={{ background: "#fdecea", color: "#c62828", border: "1px solid #f4c7c3", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }}>
              {formError}
            </div>
          )}
          <label style={{ fontSize: 12, fontWeight: 600 }}>Thiết bị *
            <select name="equipmentId" required defaultValue={editing?.equipmentId ?? slotPrefill?.equipmentId ?? ""} style={fieldStyle}>
              <option value="">—</option>
              {readyEquipment.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Bắt đầu *
              <input type="datetime-local" name="startTime" required defaultValue={editing?.startTime ? editing.startTime.slice(0, 16) : (slotPrefill?.startTime ?? "")} style={fieldStyle} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Kết thúc *
              <input type="datetime-local" name="endTime" required defaultValue={editing?.endTime ? editing.endTime.slice(0, 16) : (slotPrefill?.endTime ?? "")} style={fieldStyle} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Trung tâm
            <select name="centerId" defaultValue={editing?.centerId ?? ""} style={fieldStyle}>
              <option value="">—</option>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Người đặt *
              <input name="bookedBy" required defaultValue={editing?.bookedBy ?? ""} style={fieldStyle} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Bộ phận
              <input name="department" defaultValue={editing?.department ?? ""} style={fieldStyle} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Mục đích
            <input name="purpose" defaultValue={editing?.purpose ?? ""} style={fieldStyle} />
          </label>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá lịch đặt?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
    </PageShell>
  )
}

function DayGrid({
  equipment, bookings, selectedDate, onSlotClick,
}: { equipment: EquipmentRow[]; bookings: BookingRow[]; selectedDate: string; onSlotClick: (equipmentId: string, startMin: number) => void }) {
  const slots: number[] = []
  for (let m = SLOT_START; m < SLOT_END; m += SLOT_STEP) slots.push(m)
  const cols = equipment.length

  if (cols === 0) {
    return <div style={{ color: "#6b7280", fontSize: 13, padding: 12 }}>Không có thiết bị</div>
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: `72px repeat(${cols}, 168px)`, gridAutoRows: 28, minWidth: 72 + cols * 168 }}>
      <div style={headCellStyle} />
      {equipment.map((e, ci) => (
        <div key={e.id} style={headCellStyle}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
          <div style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: EQ_PALETTE[ci % EQ_PALETTE.length], display: "inline-block" }} />
            {e.category || "—"}
          </div>
          {e.status === "maintenance" ? (
            <span style={{ fontSize: 10, color: "#c62828" }}>Bảo trì</span>
          ) : (
            <span style={{ fontSize: 11, color: "#6b7280" }}>SL: {e.qty || 1}</span>
          )}
        </div>
      ))}
      {slots.map((m) => (
        <div key={`t-${m}`} style={{ ...timeCellStyle, gridColumn: 1 }}>{m % 60 === 0 ? minToTime(m) : ""}</div>
      ))}
      {equipment.map((e, ci) => {
        const col = ci + 2
        if (e.status === "maintenance") {
          return <div key={e.id} style={{ gridColumn: col, gridRow: `2 / span ${slots.length}`, background: "#f3f4f6" }} />
        }
        const dayBookings = bookings
          .filter((b) => b.equipmentId === e.id && dateStr(b.startTime) === selectedDate)
          .sort((a, b) => minOfDay(a.startTime) - minOfDay(b.startTime))
        return slots.map((m, ri) => {
          const bk = dayBookings.find((b) => minOfDay(b.startTime) <= m && m < minOfDay(b.endTime))
          if (bk) {
            if (minOfDay(bk.startTime) !== m) return null
            const span = Math.max(1, Math.round((minOfDay(bk.endTime) - minOfDay(bk.startTime)) / SLOT_STEP))
            return (
              <div
                key={`${e.id}-${m}`}
                title={`${bk.bookedBy ?? ""} — ${timeStr(bk.startTime)}-${timeStr(bk.endTime)}${bk.purpose ? " — " + bk.purpose : ""}`}
                style={{ gridColumn: col, gridRow: `${ri + 2} / span ${span}`, background: "#fdecc8", borderLeft: "3px solid #f59e0b", borderRadius: 4, padding: "2px 6px", fontSize: 11, overflow: "hidden" }}
              >
                <b>{bk.bookedBy ?? "—"}</b>
                <div>{timeStr(bk.startTime)}–{timeStr(bk.endTime)}</div>
              </div>
            )
          }
          return (
            <button
              key={`${e.id}-${m}`}
              type="button"
              onClick={() => onSlotClick(e.id, m)}
              style={{ gridColumn: col, gridRow: ri + 2, border: "none", borderTop: m % 60 === 0 ? "1px solid #eef0f2" : "1px dashed #f4f5f6", background: "transparent", cursor: "pointer" }}
            />
          )
        })
      })}
    </div>
  )
}

function MonthGrid({
  equipment, bookings, monthIso, onDayClick,
}: { equipment: EquipmentRow[]; bookings: BookingRow[]; monthIso: string; onDayClick: (day: string) => void }) {
  const [y, m] = monthIso.split("-").map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const cols = equipment.length
  const today = todayIso()

  if (cols === 0) return <div style={{ color: "#6b7280", fontSize: 13, padding: 12 }}>Không có thiết bị</div>

  return (
    <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${cols}, 168px)`, gridAutoRows: 28, minWidth: 60 + cols * 168 }}>
      <div style={headCellStyle} />
      {equipment.map((e, ci) => (
        <div key={e.id} style={headCellStyle}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
          <div style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: EQ_PALETTE[ci % EQ_PALETTE.length], display: "inline-block" }} />
            {e.category || "—"}
          </div>
        </div>
      ))}
      {days.map((d) => {
        const iso = `${y}-${pad(m)}-${pad(d)}`
        return <div key={d} style={{ ...timeCellStyle, gridColumn: 1, fontWeight: iso === today ? 700 : 400, color: iso === today ? "#1d5fd6" : undefined }}>{d}</div>
      })}
      {equipment.map((e, ci) => {
        const col = ci + 2
        return days.map((d, ri) => {
          const iso = `${y}-${pad(m)}-${pad(d)}`
          const count = bookings.filter((b) => b.equipmentId === e.id && dateStr(b.startTime) === iso).length
          return (
            <button
              key={`${e.id}-${d}`}
              type="button"
              onClick={() => onDayClick(iso)}
              title={count > 0 ? `${count} lượt đặt ngày ${fmtVN(iso)}` : "Không có lượt đặt"}
              style={{
                gridColumn: col, gridRow: ri + 2, border: "1px solid #f1f3f5", background: count > 0 ? "#eaf1ff" : "transparent",
                color: count > 0 ? "#1d5fd6" : "#c7cbd1", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              {count > 0 ? count : ""}
            </button>
          )
        })
      })}
    </div>
  )
}

function YearGrid({
  equipment, bookings, yearIso, onMonthClick,
}: { equipment: EquipmentRow[]; bookings: BookingRow[]; yearIso: string; onMonthClick: (monthIso: string) => void }) {
  const y = Number(yearIso.slice(0, 4))
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const cols = equipment.length
  const now = new Date()
  const curMonth = now.getFullYear() === y ? now.getMonth() + 1 : 0

  if (cols === 0) return <div style={{ color: "#6b7280", fontSize: 13, padding: 12 }}>Không có thiết bị</div>

  return (
    <div style={{ display: "grid", gridTemplateColumns: `60px repeat(${cols}, 168px)`, gridAutoRows: 34, minWidth: 60 + cols * 168 }}>
      <div style={headCellStyle} />
      {equipment.map((e, ci) => (
        <div key={e.id} style={headCellStyle}>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{e.name}</div>
          <div style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: EQ_PALETTE[ci % EQ_PALETTE.length], display: "inline-block" }} />
            {e.category || "—"}
          </div>
        </div>
      ))}
      {months.map((mm) => (
        <div key={mm} style={{ ...timeCellStyle, gridColumn: 1, fontWeight: mm === curMonth ? 700 : 400, color: mm === curMonth ? "#1d5fd6" : undefined }}>{MONTH_LABELS[mm - 1]}</div>
      ))}
      {equipment.map((e, ci) => {
        const col = ci + 2
        return months.map((mm, ri) => {
          const prefix = `${y}-${pad(mm)}`
          const count = bookings.filter((b) => b.equipmentId === e.id && dateStr(b.startTime).startsWith(prefix)).length
          return (
            <button
              key={`${e.id}-${mm}`}
              type="button"
              onClick={() => onMonthClick(`${prefix}-01`)}
              title={count > 0 ? `${count} lượt đặt tháng ${mm}/${y}` : "Không có lượt đặt"}
              style={{
                gridColumn: col, gridRow: ri + 2, border: "1px solid #f1f3f5", background: count > 0 ? "#eaf1ff" : "transparent",
                color: count > 0 ? "#1d5fd6" : "#c7cbd1", fontSize: 11, fontWeight: 600, cursor: "pointer",
              }}
            >
              {count > 0 ? count : ""}
            </button>
          )
        })
      })}
    </div>
  )
}

const navBtnStyle: CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff", cursor: "pointer", fontSize: 13 }
const inputStyle: CSSProperties = { padding: "6px 10px", borderRadius: 8, border: "1px solid #dfe3e8", fontSize: 13 }
const fieldStyle: CSSProperties = { width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }
const headCellStyle: CSSProperties = { padding: "6px 10px", borderBottom: "1px solid #e2e5e9", background: "#fafbfc" }
const timeCellStyle: CSSProperties = { fontSize: 11, color: "#6b7280", padding: "4px 8px", borderTop: "1px solid #eef0f2" }
const thStyle: CSSProperties = { padding: "8px 20px" }
const tdStyle: CSSProperties = { padding: "8px 20px" }

function legendSwatch(bg: string, border: string): CSSProperties {
  return { display: "inline-block", width: 10, height: 10, borderRadius: 2, background: bg, border: `1px solid ${border}`, marginRight: 4, verticalAlign: "middle" }
}

export default BookingsView
