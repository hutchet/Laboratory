import { cn } from "@/shared/lib/cn"

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger"

// Ported từ bản gốc: <span class="pill" style="color:var(--COLOR)">...</span>
// (dòng 5112/5146 taskflow_original.html) — original không định nghĩa màu
// nền/chữ riêng cho badge, mà dùng đúng class ".pill" có sẵn trong CSS gốc +
// chọn màu qua biến CSS (--red/--green/--amber/--pri/--neutral). CSS ".pill"
// (globals.css dòng 307-308) và override ".material-3 .pill[style*=...]"
// (dòng 1407-1409) sẽ tự xử lý nền/viền/chấm tròn theo màu này — không cần
// tự bịa bảng màu/kích thước riêng như trước đây ("tf-status-badge").
const TONE_COLOR_VAR: Record<StatusTone, string> = {
  neutral: "var(--neutral)",
  info: "var(--pri)",
  success: "var(--green)",
  warning: "var(--amber)",
  danger: "var(--red)",
}

export type StatusBadgeProps = { label: string; tone?: StatusTone; className?: string }

export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span className={cn("pill", className)} style={{ color: TONE_COLOR_VAR[tone] }}>
      {label}
    </span>
  )
}

export default StatusBadge
