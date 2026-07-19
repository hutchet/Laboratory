"use client"

// Port 1:1 tu renderDueBars() ban goc (taskflow_original.html dong
// ~4719-4785): duong SVG line+area mem (cubic bezier qua trung diem), diem
// nhan max duoc highlight, tooltip khi hover/click vao tung diem.
import { useState } from "react"
import type { DueBarPoint } from "../compute"

export function DueBarsChart({ points }: { points: DueBarPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const counts = points.map((p) => p.count)
  const maxC = Math.max(1, ...counts)
  const W = 900
  const H = 170
  const PAD_TOP = 30
  const BASE = 150
  const pts = counts.map((c, i) => ({
    x: i * (W / Math.max(points.length - 1, 1)),
    y: BASE - 4 - (c / maxC) * (BASE - PAD_TOP - 4),
  }))

  function smoothLine(p: { x: number; y: number }[]): string {
    let d = `M${p[0].x.toFixed(1)},${p[0].y.toFixed(1)}`
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i]
      const p1 = p[i + 1]
      const cpx = ((p0.x + p1.x) / 2).toFixed(1)
      d += ` C${cpx},${p0.y.toFixed(1)} ${cpx},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`
    }
    return d
  }

  const linePath = smoothLine(pts)
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${BASE} L${pts[0].x.toFixed(1)},${BASE} Z`

  let hi = 0
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[hi]) hi = i
  const activeIdx = hover ?? hi
  const activePt = pts[activeIdx]
  const leftPct = Math.max(6, Math.min(94, (activePt.x / W) * 100))
  const topPct = (activePt.y / H) * 100

  return (
    <div className="bal-chart">
      <svg className="bal-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="balFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--pri)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--pri)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={0} y1={BASE} x2={W} y2={BASE} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        <path d={areaPath} fill="url(#balFillGrad)" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--pri)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3.2} fill="var(--pri)" opacity={i === 0 || i === pts.length - 1 ? 0.85 : 1} />
        ))}
        <line x1={activePt.x} y1={activePt.y} x2={activePt.x} y2={BASE} stroke="var(--muted)" strokeWidth={1.3} strokeDasharray="4 4" />
        <circle cx={activePt.x} cy={activePt.y} r={5.5} fill="#fff" stroke="var(--pri)" strokeWidth={3} />
      </svg>
      <div className={`bal-tooltip${hover === null ? " hidden" : ""}`} style={{ left: `${leftPct}%`, top: `${topPct}%` }}>
        {counts[activeIdx]} công việc đến hạn{points[activeIdx]?.label ? ` — ${points[activeIdx].label}` : ""}
        <span className="bal-tooltip-arrow" />
      </div>
      <div className="bal-hits">
        {pts.map((_, i) => (
          <div
            key={i}
            className="bal-hit"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover(i)}
          />
        ))}
      </div>
      <div className="bal-days">
        {points.map((d, i) => (
          <div key={i} className={`bal-day${d.isToday ? " today" : ""}`}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default DueBarsChart
