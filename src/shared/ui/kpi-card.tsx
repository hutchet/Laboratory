import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

export type KpiCardTone = "neutral" | "blue" | "success" | "warning" | "danger"

export type KpiCardProps = {
  label: string
  value: ReactNode
  hint?: string
  // neutral = lavender xanh nhạt, success = xanh lá nhạt, warning = trắng/xám nhạt, danger = hồng nhạt, blue = xanh dương đậm
  tone?: KpiCardTone
  icon?: ReactNode
  className?: string
  onClick?: () => void
  size?: "hero" | "sm"
}

// Màu flat pastel khớp ảnh chuẩn
const TONE_STYLE: Record<KpiCardTone, { bg: string; valueColor: string; border: string }> = {
  neutral: { bg: "#eef1fb",  valueColor: "#1d5fd6", border: "#d8e0f7" },
  blue:    { bg: "#dbeafe",  valueColor: "#1d4ed8", border: "#bfdbfe" },
  success: { bg: "#e6f5ed",  valueColor: "#16a34a", border: "#bbf7d0" },
  warning: { bg: "#f4f5f7",  valueColor: "#374151", border: "#e5e7eb" },
  danger:  { bg: "#fdf0f0",  valueColor: "#dc2626", border: "#fecaca" },
}

export function KpiCard({
  label, value, hint, tone = "neutral", icon, className, onClick, size = "sm",
}: KpiCardProps) {
  const s = TONE_STYLE[tone]
  return (
    <div
      className={cn("kcard", size === "hero" ? "kcard-hero" : "kcard-sm", onClick ? "clickable" : undefined, className)}
      data-tf-kit="kpi-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      {icon && <div className="kcard-icon" style={{ color: s.valueColor }}>{icon}</div>}
      <div style={{ fontSize: 28, fontWeight: 700, color: s.valueColor, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 13, color: "#5b637a", fontWeight: 500, marginTop: 2 }}>{label}</div>
      {hint ? <div style={{ fontSize: 11.5, color: "#9aa1ab", marginTop: 2 }}>{hint}</div> : null}
    </div>
  )
}

export default KpiCard
