import { cn } from "@/shared/lib/cn"
import type { ReactNode } from "react"

export type KpiCardTone = "neutral" | "blue" | "success" | "warning" | "danger"

// Nang cap 2026-07-20 (ban ae, y/c #2): trend dung chung cho KpiCard - port
// tu phong cach the KPI hero trang Tong quan (renderSparkline/renderTrend
// trong DashboardView.tsx + computeKpiTrend/computeKpiSparklines trong
// features/dashboard/compute.ts). sparkline la 7 diem gan nhat (cu->moi), neu
// khong co du lieu lich su thi chi hien pill mui-ten+% thay cho bieu do.
export type KpiCardTrend = { pct: number; up: boolean; sparkline?: number[] }

export type KpiCardProps = {
  label: string
  value: ReactNode
  hint?: string
  tone?: KpiCardTone
  icon?: ReactNode
  className?: string
  onClick?: () => void
  size?: "hero" | "sm"
  trend?: KpiCardTrend
}

// Bieu do duong nho (mini sparkline) ben phai gia tri - ban rut gon, tu-chua
// (khong phu thuoc closure cua DashboardView) de dung chung duoc moi noi.
function KpiSparkline({ values, up, hero }: { values: number[]; up: boolean; hero?: boolean }) {
  if (!values || values.length < 2) return null
  const W = hero ? 72 : 46, H = hero ? 30 : 22, PAD = 3
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const xs = values.map((_, i) => PAD + (i / (values.length - 1)) * (W - PAD * 2))
  const ys = values.map((v) => H - PAD - ((v - min) / range) * (H - PAD * 2))
  const color = up ? "var(--green, #16a34a)" : "var(--red, #dc2626)"
  const d = xs.reduce((acc, x, i) => acc + (i === 0 ? `M${x.toFixed(1)},${ys[i].toFixed(1)}` : ` L${x.toFixed(1)},${ys[i].toFixed(1)}`), "")
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="kcard-spark">
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={hero ? 3 : 2.3} fill={color} />
    </svg>
  )
}

function KpiTrendPill({ pct, up }: { pct: number; up: boolean }) {
  return (
    <span className={cn("kcard-trend", up ? undefined : "dn")}>
      <span className="tri">{up ? "▲" : "▼"}</span>{pct}%
    </span>
  )
}

// Tone -> CSS class: .kb (blue/neutral), .kg (green/success), .kp (warning), .kr (red/danger)
// Material-3 CSS (globals.css line 1065-1068) applies md-sys-color-*-container backgrounds
// via these classes with !important, overriding any inline background
const TONE_CLASS: Record<KpiCardTone, string> = {
  neutral: "kb",
  blue:    "kb",
  success: "kg",
  warning: "kp",
  danger:  "kr",
}

export function KpiCard({
  label, value, hint, tone = "neutral", icon, className, onClick, size = "sm", trend,
}: KpiCardProps) {
  const toneClass = TONE_CLASS[tone]
  const hasSparkline = !!trend?.sparkline && trend.sparkline.length >= 2
  return (
    <div
      className={cn("kcard", size === "hero" ? "kcard-hero" : "kcard-sm", toneClass, onClick ? "clickable" : undefined, className)}
      data-tf-kit="kpi-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {icon && <div className="kcard-icon">{icon}</div>}
      {trend ? (
        <div className="kcard-val-row">
          <div className="v">{value}</div>
          {hasSparkline ? (
            <KpiSparkline values={trend.sparkline as number[]} up={trend.up} hero={size === "hero"} />
          ) : (
            <KpiTrendPill pct={trend.pct} up={trend.up} />
          )}
        </div>
      ) : (
        <div className="v">{value}</div>
      )}
      <div className="l">{label}</div>
      {hint ? <div className="s">{hint}</div> : null}
      {trend ? (
        <div className="s">
          <span className={cn("wk-chg", trend.up ? "up" : "dn")}>{trend.up ? "▲" : "▼"} {trend.pct}%</span> so với tuần trước
        </div>
      ) : null}
    </div>
  )
}

export default KpiCard
