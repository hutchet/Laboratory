import { cn } from "@/shared/lib/cn"
import type { ReactNode } from "react"

export type KpiCardTone = "neutral" | "blue" | "success" | "warning" | "danger"

export type KpiCardProps = {
  label: string
  value: ReactNode
  hint?: string
  tone?: KpiCardTone
  icon?: ReactNode
  className?: string
  onClick?: () => void
  size?: "hero" | "sm"
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
  label, value, hint, tone = "neutral", icon, className, onClick, size = "sm",
}: KpiCardProps) {
  const toneClass = TONE_CLASS[tone]
  return (
    <div
      className={cn("kcard", size === "hero" ? "kcard-hero" : "kcard-sm", toneClass, onClick ? "clickable" : undefined, className)}
      data-tf-kit="kpi-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
      {icon && <div className="kcard-icon">{icon}</div>}
      <div className="v">{value}</div>
      <div className="l">{label}</div>
      {hint ? <div className="s">{hint}</div> : null}
    </div>
  )
}

export default KpiCard
