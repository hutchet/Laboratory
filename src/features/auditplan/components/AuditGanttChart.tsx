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
 * dong 3896-3897 & 6047-6069).
 */
export function AuditGanttChart({ items, phases }: { items: AuditItemRow[]; phases: AuditPhaseRow[] }) {
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

  if (items.length === 0) {
    return <div style={{ padding: 24, textAlign: "center", color: "#8a8f98", fontSize: 13 }}>Chưa có hạng mục nào để hiển thị Gantt.</div>
  }

  return (
    <div>
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
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
            style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #dfe3e8", fontSize: 12.5 }}
          />
          <ArrowButton direction="chevronRight" onClick={() => shiftFocus(1)} ariaLabel="Tới thời gian" />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {ZOOM_OPTIONS.map((z) => (
            <button
              key={z.key}
              type="button"
              onClick={() => setZoom(z.key)}
              style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #1d5fd6", background: zoom === z.key ? "#1d5fd6" : "#fff", color: zoom === z.key ? "#fff" : "#1d5fd6", fontSize: 12.5, cursor: "pointer" }}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ overflowX: "auto", border: "1px solid #e6e9ee", borderRadius: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: `220px repeat(${cols.length}, ${colWidth}px)`, minWidth: 220 + cols.length * colWidth }}>
          <div style={{ gridColumn: 1, gridRow: "1 / span 2", background: "#f7f8fa", borderBottom: "1px solid #e6e9ee", borderRight: "1px solid #e6e9ee" }} />
          {runs.map((run) => (
            <div key={run.startIdx} style={{ gridColumn: `${run.startIdx + 2} / span ${run.span}`, gridRow: 1, fontSize: 10.5, fontWeight: 700, textAlign: "center", padding: "3px 0", background: "#eef2f7", borderBottom: "1px solid #e6e9ee", color: "#4b5563" }}>
              {groupLabel(zoom, run.group)}
            </div>
          ))}
          {cols.map((c, i) => (
            <div
              key={c.key}
              ref={(el) => { colRefs.current[i] = el }}
              style={{ gridColumn: i + 2, gridRow: 2, fontSize: 10, textAlign: "center", padding: "4px 0", background: c.isToday ? "#e3edff" : c.isWeekend ? "#f2f3f5" : "#f7f8fa", borderBottom: "1px solid #e6e9ee", color: "#6b7280" }}
            >
              {c.label}
            </div>
          ))}
          {rows.map((r, ri) => {
            const row = ri + 3
            if (r.type === "phase") {
              return (
                <div key={`phase-${r.phase.id}`} style={{ gridColumn: `1 / span ${cols.length + 1}`, gridRow: row, background: "#eef2f7", fontWeight: 700, fontSize: 12, padding: "5px 10px" }}>
                  {r.phase.name}
                </div>
              )
            }
            const it = r.item
            const status = auditAutoStatus(it)
            const color = AUDIT_STATUS_COLOR[status] || "#9aa1ab"
            const planS = toDay(it.planStart), planE = toDay(it.planEnd) || planS
            const actS = toDay(it.actualStart), actE = toDay(it.actualEnd) || (actS ? today : null)
            return (
              <div key={it.id} style={{ display: "contents" }}>
                <div style={{ gridColumn: 1, gridRow: row, fontSize: 12, padding: "6px 10px", borderTop: "1px solid #f1f2f4", borderRight: "1px solid #e6e9ee", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={it.name}>
                  {it.name}
                </div>
                {cols.map((c, ci) => (
                  <div key={ci} style={{ gridColumn: ci + 2, gridRow: row, borderTop: "1px solid #f1f2f4", background: c.isToday ? "#f5f8ff" : undefined }} />
                ))}
                {planS && (
                  <div
                    title={`${it.name} (${AUDIT_STATUS_LABEL[status] || status}) ${planS} → ${planE}`}
                    style={{
                      gridColumn: `${colIndexForDate(cols, planS) + 2} / span ${colSpan(cols, planS, planE || planS)}`,
                      gridRow: row,
                      margin: "6px 2px",
                      borderRadius: 5,
                      background: color,
                      opacity: actS ? 0.35 : 0.85,
                      height: 14,
                    }}
                  />
                )}
                {actS && (() => {
                  // Port cua ap-legend-dot.stripe ban goc (dong 1852, 3906): phan
                  // thuc te vuot qua ngay ket thuc ke hoach duoc ve co soc rieng.
                  const overrunStart = planE && actE && actE > planE ? addDays(planE, 1) : null
                  const normalEnd = overrunStart ? planE! : actE || actS
                  return (
                    <>
                      <div
                        title={`Thực tế: ${actS} → ${actE}`}
                        style={{
                          gridColumn: `${colIndexForDate(cols, actS) + 2} / span ${colSpan(cols, actS, normalEnd)}`,
                          gridRow: row,
                          margin: overrunStart ? "6px 0 6px 2px" : "6px 2px",
                          borderRadius: overrunStart ? "5px 0 0 5px" : 5,
                          background: color,
                          height: 14,
                          position: "relative",
                          top: -20,
                        }}
                      />
                      {overrunStart && actE && (
                        <div
                          title={`Vượt kế hoạch: ${overrunStart} → ${actE}`}
                          style={{
                            gridColumn: `${colIndexForDate(cols, overrunStart) + 2} / span ${colSpan(cols, overrunStart, actE)}`,
                            gridRow: row,
                            margin: "6px 2px 6px 0",
                            borderRadius: "0 5px 5px 0",
                            background: color,
                            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0, rgba(255,255,255,.5) 3px, transparent 3px, transparent 6px)",
                            height: 14,
                            position: "relative",
                            top: -20,
                          }}
                        />
                      )}
                    </>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
