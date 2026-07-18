"use client"

import type { ReactNode } from "react"

// Ha tang bieu do donut dung chung, thay 3 ban ve SVG tay trung lap o
// Dash/Plan/AuditPlan (DonutCircles/Donut). Giu dung toan hoc/kich thuoc goc
// (r=15.9155, viewBox 0 0 42 42) de khong lech UI so voi ban da audit.

export type DonutSegment = { value: number; color: string }

const DONUT_R = 15.9155
const DONUT_CIRC = 2 * Math.PI * DONUT_R

export function DonutChart({
  segments,
  size = 120,
  strokeWidth = 5,
  background,
  center,
}: {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  // Mau vong tron nen (ve truoc cac segment). Bo qua neu khong can (giong ban Dash goc).
  background?: string
  // Noi dung hien giua donut (vi du tong gia tri) - dung cho kieu Dash.
  center?: ReactNode
}) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  let cumulative = 0
  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <svg width={size} height={size} viewBox="0 0 42 42">
        {background && (
          <circle cx="21" cy="21" r={DONUT_R} fill="transparent" stroke={background} strokeWidth={strokeWidth} />
        )}
        {segments.map((seg, i) => {
          const len = total ? (seg.value / total) * DONUT_CIRC : 0
          const offset = 25 - cumulative
          cumulative += (total ? (seg.value / total) * 100 : 0)
          if (len <= 0) return null
          return (
            <circle
              key={i}
              cx="21"
              cy="21"
              r={DONUT_R}
              fill="transparent"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${len} ${DONUT_CIRC - len}`}
              strokeDashoffset={offset}
            />
          )
        })}
      </svg>
      {center && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {center}
        </div>
      )}
    </div>
  )
}
