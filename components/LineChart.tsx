"use client"
import { useRef, useState } from "react"

type Point = { label: string; count: number }

export function LineChart({ data, color = "var(--pri)" }: { data: Point[]; color?: string }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; count: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (!data.length) return null
  const W = 560; const H = 140; const PL = 28; const PR = 16; const PT = 16; const PB = 32
  const gW = W - PL - PR; const gH = H - PT - PB
  const maxVal = Math.max(1, ...data.map(d => d.count))
  const n = data.length

  const px = (i: number) => PL + (i / (n - 1 || 1)) * gW
  const py = (v: number) => PT + gH - (v / maxVal) * gH

  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"} ${px(i).toFixed(1)} ${py(d.count).toFixed(1)}`).join(" ")
  const areaD = `${pathD} L ${px(n-1).toFixed(1)} ${(PT+gH).toFixed(1)} L ${px(0).toFixed(1)} ${(PT+gH).toFixed(1)} Z`

  // Active point index from tooltip
  const activeIdx = tooltip ? data.findIndex(d => d.label === tooltip.label) : -1

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", display: "block", overflow: "visible" }}
        onMouseMove={(e) => {
          const rect = svgRef.current!.getBoundingClientRect()
          const mx = ((e.clientX - rect.left) / rect.width) * W
          const closest = data.reduce((best, d, i) => {
            const dist = Math.abs(px(i) - mx)
            return dist < best.dist ? { dist, idx: i } : best
          }, { dist: Infinity, idx: 0 })
          const i = closest.idx
          setTooltip({ x: px(i), y: py(data[i].count), label: data[i].label, count: data[i].count })
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaD} fill="url(#lc-grad)" />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Active dashed line */}
        {activeIdx >= 0 && (
          <line
            x1={px(activeIdx)} y1={PT} x2={px(activeIdx)} y2={PT+gH}
            stroke={color} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.6}
          />
        )}
        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={px(i)} cy={py(d.count)} r={activeIdx === i ? 5 : 3}
            fill={activeIdx === i ? color : "var(--card)"} stroke={color} strokeWidth={2} />
        ))}
        {/* X axis labels */}
        {data.map((d, i) => (
          <text key={i} x={px(i)} y={H - 4} textAnchor="middle" fontSize={11}
            fill={i === 0 ? "var(--ink)" : "var(--muted)"} fontWeight={i === 0 ? 600 : 400}>
            {d.label}
          </text>
        ))}
        {/* Baseline */}
        <line x1={PL} y1={PT+gH} x2={W-PR} y2={PT+gH} stroke="var(--line)" strokeWidth={1} strokeDasharray="3 4" />
      </svg>
      {/* Tooltip */}
      {tooltip && tooltip.count > 0 && (
        <div style={{
          position: "absolute",
          left: `${(tooltip.x / W) * 100}%`,
          top: `${(tooltip.y / H) * 100}%`,
          transform: "translate(-50%, -110%)",
          background: "var(--ink)", color: "#fff",
          fontSize: 12, fontWeight: 600, padding: "4px 10px",
          borderRadius: 8, whiteSpace: "nowrap", pointerEvents: "none", zIndex: 10,
        }}>
          {tooltip.label}: {tooltip.count} CV
        </div>
      )}
    </div>
  )
}
