"use client"
import { useMemo, useRef, useState } from "react"
import { autoStatus, RESULT_COLOR, RESULT_LABEL, type TestItemRow, type TestPackRow } from "../types"
import { ArrowButton } from "@/shared/ui/arrow-button"

type Zoom = "day" | "week" | "month"

function toDay(iso: string | null): string | null {
  return iso ? iso.slice(0, 10) : null
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function pad(n: number): string {
  return String(n).padStart(2, "0")
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type Col = { key: string; label: string; group: string; rangeStart: string; rangeEnd: string; isToday: boolean; isWeekend?: boolean }

// Port cua plColumns(zoom,range) ban goc (dong ~6935): sinh cot theo 3 muc
// zoom - ngay/tuan/thang - tren cung 1 khoang thoi gian du lieu.
function buildColumns(zoom: Zoom, start: string, end: string): Col[] {
  const cols: Col[] = []
  const today = todayIso()
  if (zoom === "day") {
    let d = start
    let guard = 0
    while (d <= end && guard < 730) {
      const wd = new Date(d + "T00:00:00").getDay()
      cols.push({ key: d, label: d.slice(8, 10), group: d.slice(0, 7), rangeStart: d, rangeEnd: d, isToday: d === today, isWeekend: wd === 0 || wd === 6 })
      d = addDays(d, 1)
      guard++
    }
  } else if (zoom === "week") {
    let d = start
    let guard = 0
    while (d <= end && guard < 160) {
      let we = addDays(d, 6)
      if (we > end) we = end
      cols.push({ key: d, label: `${d.slice(8, 10)}-${we.slice(8, 10)}`, group: d.slice(0, 7), rangeStart: d, rangeEnd: we, isToday: today >= d && today <= we })
      d = addDays(d, 7)
      guard++
    }
  } else {
    let y = +start.slice(0, 4)
    let m = +start.slice(5, 7)
    const endY = +end.slice(0, 4)
    const endM = +end.slice(5, 7)
    let guard = 0
    while ((y < endY || (y === endY && m <= endM)) && guard < 60) {
      const ms = `${y}-${pad(m)}-01`
      const lastDay = new Date(y, m, 0).getDate()
      const me = `${y}-${pad(m)}-${pad(lastDay)}`
      cols.push({ key: ms, label: `Th${m}`, group: String(y), rangeStart: ms, rangeEnd: me, isToday: today >= ms && today <= me })
      m++
      if (m > 12) { m = 1; y++ }
      guard++
    }
  }
  return cols
}

function groupRuns(cols: Col[]): Array<{ group: string; span: number; startIdx: number }> {
  const runs: Array<{ group: string; span: number; startIdx: number }> = []
  cols.forEach((c, i) => {
    const last = runs[runs.length - 1]
    if (last && last.group === c.group) last.span++
    else runs.push({ group: c.group, span: 1, startIdx: i })
  })
  return runs
}

function groupLabel(zoom: Zoom, group: string): string {
  if (zoom === "day" || zoom === "week") {
    const [y, m] = group.split("-")
    return `Th ${+m}/${y}`
  }
  return `Năm ${group}`
}

function colIndexForDate(cols: Col[], iso: string): number {
  for (let i = 0; i < cols.length; i++) {
    if (iso >= cols[i].rangeStart && iso <= cols[i].rangeEnd) return i
  }
  if (cols.length && iso < cols[0].rangeStart) return 0
  return Math.max(0, cols.length - 1)
}
function colSpan(cols: Col[], sIso: string, eIso: string): number {
  return Math.max(1, colIndexForDate(cols, eIso) - colIndexForDate(cols, sIso) + 1)
}

const ZOOM_OPTIONS: Array<{ key: Zoom; label: string }> = [
  { key: "day", label: "Ngày" },
  { key: "week", label: "Tháng" },
  { key: "month", label: "Năm" },
]

/**
 * Port cua renderGanttChart ban goc: timeline CSS-grid dung dung class goc
 * (.pl-gantt/.pl-ghead/.pl-corner/.pl-rowlabel/.pl-packrow/.pl-bar/.pl-gcell)
 * da duoc port sang globals.css, thay cho inline style rieng truoc day.
 * Hang gom theo mau (.pl-packrow), thanh the hien khung ke hoach (nhat, mo)
 * + khung thuc te (dam, lech len) giong ban goc. Nhan vao ten bai test /
 * thanh Gantt de mo form sua (onEditItem) - port cua click mo modal ban goc.
 */
export function GanttChart({
  items,
  packs,
  onEditItem,
  title,
  subtitle,
}: {
  items: TestItemRow[]
  packs: TestPackRow[]
  onEditItem?: (item: TestItemRow) => void
  title?: string
  subtitle?: string
}) {
  const [zoom, setZoom] = useState<Zoom>("day")
  const [focusDate, setFocusDate] = useState<string>(todayIso())
  const colRefs = useRef<Array<HTMLDivElement | null>>([])
  const today = todayIso()

  const { start, end } = useMemo(() => {
    const dates: string[] = []
    items.forEach((it) => {
      const s = toDay(it.planStart) || toDay(it.actualStart)
      const e = toDay(it.planEnd) || toDay(it.actualEnd) || s
      if (s) dates.push(s)
      if (e) dates.push(e)
    })
    if (dates.length === 0) return { start: today, end: addDays(today, 13) }
    const sorted = dates.sort()
    return { start: addDays(sorted[0], -2), end: addDays(sorted[sorted.length - 1], 2) }
  }, [items, today])

  const cols = useMemo(() => buildColumns(zoom, start, end), [zoom, start, end])
  const runs = useMemo(() => groupRuns(cols), [cols])
  const colWidth = zoom === "day" ? 34 : zoom === "week" ? 64 : 74

  function scrollToFocus(nextFocus: string) {
    setFocusDate(nextFocus)
    const idx = colIndexForDate(cols, nextFocus)
    colRefs.current[idx]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }
  function shiftFocus(delta: number) {
    const d = new Date(focusDate + "T00:00:00")
    if (zoom === "day") d.setDate(d.getDate() + delta)
    else if (zoom === "week") d.setMonth(d.getMonth() + delta)
    else d.setFullYear(d.getFullYear() + delta)
    scrollToFocus(d.toISOString().slice(0, 10))
  }

  const focusParts = focusDate.split("-").map(Number)
  const inputType = zoom === "day" ? "date" : zoom === "week" ? "month" : "number"
  const inputValue = zoom === "day" ? focusDate : zoom === "week" ? `${focusParts[0]}-${pad(focusParts[1])}` : String(focusParts[0])

  type Row = { type: "pack"; pack: TestPackRow } | { type: "item"; item: TestItemRow }
  const rows: Row[] = []
  const packless = items.filter((it) => !it.packId)
  packs.forEach((p) => {
    rows.push({ type: "pack", pack: p })
    items.filter((it) => it.packId === p.id).forEach((it) => rows.push({ type: "item", item: it }))
  })
  packless.forEach((it) => rows.push({ type: "item", item: it }))

  const toolbar = (
    <div className="pl-toolbar">
      <div>
        {title && <h3 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h3>}
        {subtitle && <span style={{ fontSize: 12, color: "var(--muted)" }}>{subtitle}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="pl-daynav">
          <ArrowButton direction="chevronLeft" onClick={() => shiftFocus(-1)} ariaLabel="Lùi thời gian" />
          <input
            type={inputType}
            value={inputValue}
            min={zoom === "month" ? 1970 : undefined}
            onChange={(e) => {
              const v = e.target.value
              if (!v) return
              if (zoom === "day") scrollToFocus(v)
              else if (zoom === "week") scrollToFocus(`${v}-01`)
              else scrollToFocus(`${v}-01-01`)
            }}
          />
          <ArrowButton direction="chevronRight" onClick={() => shiftFocus(1)} ariaLabel="Tới thời gian" />
        </div>
        <div className="pl-zoom">
          {ZOOM_OPTIONS.map((z) => (
            <button key={z.key} type="button" className={zoom === z.key ? "active" : undefined} onClick={() => setZoom(z.key)}>
              {z.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  if (items.length === 0) {
    return (
      <div>
        {toolbar}
        <div className="pl-empty">
          <b>Chưa có bài thử nào để hiển thị Gantt.</b>
          Thêm bài thử ở mục &quot;Mẫu thử nghiệm và bài thử&quot; bên dưới.
        </div>
      </div>
    )
  }

  return (
    <div>
      {toolbar}
      <div className="pl-gantt-wrap">
        <div
          className="pl-gantt"
          style={{
            gridTemplateColumns: `200px repeat(${cols.length}, ${colWidth}px)`,
            gridAutoRows: "36px",
          }}
        >
          <div className="pl-corner" style={{ gridColumn: 1, gridRow: "1 / span 2" }} />
          {runs.map((run) => (
            <div key={run.startIdx} className="pl-ghead grp" style={{ gridColumn: `${run.startIdx + 2} / span ${run.span}`, gridRow: 1 }}>
              {groupLabel(zoom, run.group)}
            </div>
          ))}
          {cols.map((c, i) => (
            <div
              key={c.key}
              ref={(el) => { colRefs.current[i] = el }}
              className={`pl-ghead${c.isToday ? " today" : ""}${c.isWeekend ? " weekend" : ""}`}
              style={{ gridColumn: i + 2, gridRow: 2 }}
            >
              {c.label}
            </div>
          ))}
          {rows.map((r, ri) => {
            const row = ri + 3
            if (r.type === "pack") {
              return (
                <div key={`pack-${r.pack.id}`} className="pl-packrow" style={{ gridColumn: `1 / span ${cols.length + 1}`, gridRow: row }}>
                  Mẫu {r.pack.code}{r.pack.serial ? ` · ${r.pack.serial}` : ""}
                </div>
              )
            }
            const it = r.item
            const status = autoStatus(it)
            const color = RESULT_COLOR[status] || "#9aa1ab"
            const planS = toDay(it.planStart)
            const planE = toDay(it.planEnd) || planS
            const actS = toDay(it.actualStart)
            const actE = toDay(it.actualEnd) || (actS ? today : null)
            return (
              <div key={it.id} style={{ display: "contents" }}>
                <div className="pl-rowlabel" style={{ gridColumn: 1, gridRow: row }} onClick={() => onEditItem?.(it)}>
                  <div className="tn">{it.name}</div>
                  <div className="tm">{RESULT_LABEL[status] || status}</div>
                </div>
                {cols.map((c, ci) => (
                  <div key={ci} className={`pl-gcell${c.isWeekend ? " weekend" : ""}${c.isToday ? " today-col" : ""}`} style={{ gridColumn: ci + 2, gridRow: row }} />
                ))}
                {planS && (
                  <div
                    className="pl-bar"
                    onClick={() => onEditItem?.(it)}
                    title={`${it.name} — Kế hoạch: ${planS} → ${planE}`}
                    style={{
                      gridColumn: `${colIndexForDate(cols, planS) + 2} / span ${colSpan(cols, planS, planE || planS)}`,
                      gridRow: row,
                      background: color,
                      opacity: actS ? 0.42 : 0.9,
                    }}
                  >
                    {!actS && <div className="fill" style={{ width: `${Math.max(0, Math.min(100, it.progress || 0))}%` }} />}
                    <span>{it.name}</span>
                  </div>
                )}
                {actS && (
                  <div
                    className="pl-bar"
                    onClick={() => onEditItem?.(it)}
                    title={`${it.name} — Thực tế: ${actS} → ${actE}`}
                    style={{
                      gridColumn: `${colIndexForDate(cols, actS) + 2} / span ${colSpan(cols, actS, actE || actS)}`,
                      gridRow: row,
                      background: color,
                      top: -18,
                    }}
                  >
                    <div className="fill" style={{ width: `${Math.max(0, Math.min(100, it.progress || 0))}%` }} />
                    <span>{it.name}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="pl-gantt-legend">
        <div className="pl-legend" style={{ flexDirection: "row", gap: 14, flexWrap: "wrap" }}>
          {Object.entries(RESULT_LABEL).map(([k, label]) => (
            <span key={k} className="li"><span className="dot" style={{ background: RESULT_COLOR[k] }} />{label}</span>
          ))}
          <span className="li"><span style={{ width: 20, height: 8, borderRadius: 4, background: "#1d5fd6", opacity: 0.42, display: "inline-block" }} /> Khung kế hoạch</span>
          <span className="li"><span style={{ width: 20, height: 8, borderRadius: 4, background: "#1d5fd6", display: "inline-block" }} /> Khung thực tế</span>
        </div>
      </div>
    </div>
  )
}
