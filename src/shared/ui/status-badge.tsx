import { cn } from "@/shared/lib/cn"

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

const TONE_STYLE: Record<StatusTone, { bg: string; fg: string }> = {
  neutral: { bg: "#eef0f2", fg: "#3a3f45" },
  info: { bg: "#e6f0ff", fg: "#1d5fd6" },
  success: { bg: "#e6f7ec", fg: "#1a8a45" },
  warning: { bg: "#fff3e0", fg: "#b56a00" },
  danger: { bg: "#fde8e8", fg: "#c62828" },
}

export type StatusBadgeProps = { label: string; tone?: StatusTone; className?: string }

export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  const s = TONE_STYLE[tone]
  return (
    <span
      className={cn("tf-status-badge", className)}
      data-tf-kit="status-badge"
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        color: s.fg,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  )
}

export default StatusBadge
