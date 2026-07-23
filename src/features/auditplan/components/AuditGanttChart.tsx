"use client"
import { useMemo, useRef, useState } from "react"
import { auditAutoStatus, AUDIT_STATUS_COLOR, AUDIT_STATUS_LABEL, type AuditItemRow, type AuditPhaseRow } from "../types"
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

// Port cua plColumns(zoom,range) ban goc (dong ~6935), dung chung logic voi
// GanttChart cua Plan nhung tach rieng theo feature (khong import cheo feature).
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
 * Port cua renderAuditPlan Gantt block (~line 6208-6227), gio them dieu khien
 * zoom (ngay/tuan/thang) va dieu huong thoi gian (~ap-daynav/ap-zoom ban goc,
 * dong 3896-3897 & 6047-6069). Dung dung class CSS .pl-gantt-wrap/.pl-gantt/
 * .pl-corner/.pl-ghead/.pl-rowlabel/.pl-packrow/.pl-gcell/.pl-bar/.pl-toolbar/
 * .pl-daynav/.pl-zoom/.pl-empty voi GanttChart cua Plan (globals.css) de dong
 * bo cuon ngang+doc (max-height, sticky header/label) va bam vao hang/thanh
 * Gantt de mo form sua (onEditItem) - truoc day component nay tu ve toan bo
 * bang inline style, khong cuon doc duoc va khong bam-sua duoc.
 */
export function AuditGanttChart({
  items,
  phases,
  onEditItem,
}: {
  items: AuditItemRow[]
  phases: AuditPhaseRow[]
  onEditItem?: (item: AuditItemRow) => void
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
  const colWidth = zoom === "day" ? 26 : zoom === "week" ? 50 : 60

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

  type Row = { type: "phase"; phase: AuditPhaseRow } | { type: "item"; item: AuditItemRow }
  const rows: Row[] = []
  const orphan = items.filter((it) => !it.phaseId)
  const sortedPhases = [...phases].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  sortedPhases.forEach((p) => {
    const own = items.filter((it) => it.phaseId === p.id)
    if (own.length === 0) return
    rows.push({ type: "phase", phase: p })
    own.forEach((it) => rows.push({ type: "item", item: it }))
  })
  if (orphan.length > 0) {
    orphan.forEach((it) => rows.push({ type: "item", item: it }))
  }

  const legend = (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, marginBottom: 8 }}>
      {(Object.keys(AUDIT_STATUS_COLOR) as Array<keyof typeof AUDIT_STATUS_COLOR>).map((k) => (
        <span key={k} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ display: "inline-block", width: 14, height: 10, borderRadius: 3, background: AUDIT_STATUS_COLOR[k] }} />
          {AUDIT_STATUS_LABEL[k]}
        </span>
      ))}
      {/* Port cua 2 muc legend con thieu (dong 3905-3906 ban goc): thanh ke
          hoach nhat + thanh vuot ke hoach co soc, khop du 6 muc legend goc. */}
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ display: "inline-block", width: 14, height: 10, borderRadius: 3, background: "#1d5fd6", opacity: 0.45 }} />
        Kế hoạch (nhạt)
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ display: "inline-block", width: 14, height: 10, borderRadius: 3, background: "#c62828", backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0, rgba(255,255,255,.5) 3px, transparent 3px, transparent 6px)" }} />
        Vượt so với kế hoạch (thực tế trễ hơn)
      </span>
    </div>
  )

  const toolbar = (
    <div className="pl-toolbar">
      <div />
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
        {legend}
        {toolbar}
        <div className="pl-empty">
          <b>Chưa có hạng mục nào để hiển thị Gantt.</b>
          Thêm hạng mục ở bảng bên dưới.
        </div>
      </div>
    )
  }

  return (
    <div>
      {legend}
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
            if (r.type === "phase") {
              return (
                <div key={`phase-${r.phase.id}`} className="pl-packrow" style={{ gridColumn: `1 / span ${cols.length + 1}`, gridRow: row }}>
                  {r.phase.name}
                </div>
              )
            }
            const it = r.item
            const status = auditAutoStatus(it)
            const color = AUDIT_STATUS_COLOR[status] || "#9aa1ab"
            const planS = toDay(it.planStart)
            const planE = toDay(it.planEnd) || planS
            const actS = toDay(it.actualStart)
            const actE = toDay(it.actualEnd) || (actS ? today : null)
            // Port cua ap-legend-dot.stripe ban goc (dong 1852, 3906): phan thuc te
            // vuot qua ngay ket thuc ke hoach duoc ve co soc rieng, gio dung lop phu
            // ".seg seg-beyond-late" ben trong CHINH thanh thuc te (globals.css ~671-676)
            // thay cho 1 div tuyet doi rieng nhu ban truoc.
            const overrunStart = planE && actE && actE > planE ? addDays(planE, 1) : null
            const actSpan = colSpan(cols, actS || today, actE || actS || today)
            const overrunPct = overrunStart && actS ? ((colIndexForDate(cols, overrunStart) - colIndexForDate(cols, actS)) / actSpan) * 100 : null
            return (
              <div key={it.id} style={{ display: "contents" }}>
                <div className="pl-rowlabel" style={{ gridColumn: 1, gridRow: row }} onClick={() => onEditItem?.(it)}>
                  <div className="tn">{it.name}</div>
                  <div className="tm">{AUDIT_STATUS_LABEL[status] || status}</div>
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
                      alignSelf: actS ? "start" : "center",
                      height: actS ? 15 : 22,
                      margin: actS ? "2px 2px 0" : "6px 2px",
                    }}
                  >
                    <span>{it.name}</span>
                  </div>
                )}
                {actS && (
                  <div
                    className="pl-bar"
                    onClick={() => onEditItem?.(it)}
                    title={`${it.name} — Thực tế: ${actS} → ${actE}${overrunStart ? " (vượt kế hoạch)" : ""}`}
                    style={{
                      gridColumn: `${colIndexForDate(cols, actS) + 2} / span ${actSpan}`,
                      gridRow: row,
                      background: color,
                      alignSelf: planS ? "end" : "center",
                      height: planS ? 15 : 22,
                      margin: planS ? "0 2px 2px" : "6px 2px",
                    }}
                  >
                    {overrunPct != null && (
                      <div className="seg seg-beyond-late" style={{ left: `${overrunPct}%`, width: `${100 - overrunPct}%` }} />
                    )}
                    <span>{it.name}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
