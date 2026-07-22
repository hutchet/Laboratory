import { cn } from "@/shared/lib/cn"
import type { ReactNode } from "react"

export type KpiCardTone = "neutral" | "blue" | "success" | "warning" | "danger"

// Nang cap 2026-07-20 (ban ae, y/c #2): trend dung chung cho KpiCard - port
// tu phong cach the KPI hero trang Tong quan (renderSparkline/renderTrend
// trong DashboardView.tsx + computeKpiTrend/computeKpiSparklines trong
// features/dashboard/compute.ts). sparkline la 7 diem gan nhat (cu->moi), neu
// khong co du lieu lich su thi chi hien pill mui-ten+% thay cho bieu do.
export type KpiCardTrend = { pct: number; up: boolean | null; sparkline?: number[] }

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
function KpiSparkline({ values, up, hero, tone }: { values: number[]; up: boolean | null; hero?: boolean; tone?: KpiCardTone }) {
  if (!values || values.length < 2) return null
  const W = hero ? 72 : 46, H = hero ? 30 : 22, PAD = 3
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const xs = values.map((_, i) => PAD + (i / (values.length - 1)) * (W - PAD * 2))
  const ys = values.map((v) => H - PAD - ((v - min) / range) * (H - PAD * 2))
  const color = trendColor(tone ?? "neutral")
  const d = xs.reduce((acc, x, i) => acc + (i === 0 ? `M${x.toFixed(1)},${ys[i].toFixed(1)}` : ` L${x.toFixed(1)},${ys[i].toFixed(1)}`), "")
  const fillD = `${d} L${xs[xs.length-1]},${H} L${xs[0]},${H} Z`
  const gradId = `ksg-${tone ?? "n"}-${values.length}-${Date.now()}`
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="kcard-spark">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} stroke="none" />
      <path d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r={hero ? 3 : 2.3} fill={color} />
    </svg>
  )
}

function KpiTrendPill({ pct, up }: { pct: number; up: boolean | null }) {
  if (up === null) return null
  return (
    <span className={cn("kcard-trend", up ? undefined : "dn")}>
      <span className="tri">{up ? "▲" : "▼"}</span>{pct}%
    </span>
  )
}

// Tone → màu sparkline stroke (đậm hơn nền)
// Nền success (xanh lá nhạt) → stroke green-700 (#15803d)
// Nền warning (cam) → stroke orange-700 (#c2410c)
// Nền blue (xanh dương) → stroke blue-700 (#1d4ed8)
// Nền danger (đỏ) → stroke red-700 (#b91c1c)
// Nền neutral (xám) → stroke gray-600 (#4b5563)
const TONE_SPARK_COLOR: Record<KpiCardTone, string> = {
  neutral: "#4b5563",
  blue:    "#1d4ed8",
  success: "#15803d",
  warning: "#c2410c",
  danger:  "#b91c1c",
}

// Màu sparkline = màu tone card (đậm hơn nền), KHÔNG đổi theo up/down
// Up/down chỉ quyết định ▲/▼ trong label text
function trendColor(tone: KpiCardTone): string {
  return TONE_SPARK_COLOR[tone]
}
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
            <KpiSparkline values={trend.sparkline as number[]} up={trend.up} hero={size === "hero"} tone={tone} />
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
          {trend.up !== null ? (
            <span className={cn("wk-chg", trend.up ? "up" : "dn")}>{trend.up ? "▲" : "▼"} {trend.pct}%</span>
          ) : (
            <span className="wk-chg flat">— 0%</span>
          )} so với tuần trước
        </div>
      ) : null}
    </div>
  )
}

export default KpiCard
