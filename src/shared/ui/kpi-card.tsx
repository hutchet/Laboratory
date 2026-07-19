import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

export type KpiCardProps = {
  label: string
  value: ReactNode
  hint?: string
  tone?: "neutral" | "success" | "warning" | "danger"
  icon?: ReactNode
  className?: string
  // Port cua data-detail + class "clickable" tren cac kcard ban goc (dong
  // 3336-3339): cho phep the kpi mo modal chi tiet khi bam vao.
  onClick?: () => void
}

const TONE_BORDER: Record<string, string> = {
  neutral: "#e2e5e9",
  success: "#bfe8cd",
  warning: "#f6dcae",
  danger: "#f4bcbc",
}

export function KpiCard({ label, value, hint, tone = "neutral", icon, className, onClick }: KpiCardProps) {
  return (
    <div
      className={cn("tf-kpi-card", className)}
      data-tf-kit="kpi-card"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={{
        border: `1px solid ${TONE_BORDER[tone]}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 160,
        background: "#fff",
        cursor: onClick ? "pointer" : undefined,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.65, fontWeight: 600, textTransform: "uppercase" }}>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      {hint ? <div style={{ fontSize: 12, opacity: 0.6 }}>{hint}</div> : null}
    </div>
  )
}

export default KpiCard
