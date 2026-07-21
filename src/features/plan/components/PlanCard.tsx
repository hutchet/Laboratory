import type { MouseEventHandler } from "react"

export type PlanCardProps = {
  projectName: string
  planTitle?: string | null
  packCount: number
  itemCount: number
  passCount: number
  avgProgress: number
  onClick?: MouseEventHandler<HTMLDivElement>
}

/**
 * The bao ke hoach thu nghiem theo du an - dung o trang danh sach ke hoach
 * (PlanView) khi chua chon 1 du an cu the. Dung lai class ".pcard" (giong
 * ProjectCard) de dong bo khung/nen/hover voi the du an; bam vao the de vao
 * dung ke hoach cua du an do.
 */
export function PlanCard({ projectName, planTitle, packCount, itemCount, passCount, avgProgress, onClick }: PlanCardProps) {
  return (
    <div
      className="pcard"
      style={{ cursor: "pointer" }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>) }}
    >
      <div className="pt">
        <h4>{projectName}</h4>
      </div>
      <div className="tags">
        <span className="tag2" style={{ background: "var(--neutral-soft)", color: "var(--muted)" }}>
          {planTitle || "Chưa có kế hoạch"}
        </span>
      </div>
      <div className="pbox">
        <div className="prow">
          <span>Tiến độ trung bình</span>
          <b>{avgProgress}%</b>
        </div>
        <div className="pbar"><i style={{ width: `${avgProgress}%` }} /></div>
        <div className="pbox-sub">{packCount} mẫu · {itemCount} bài thử · {passCount} đạt</div>
      </div>
      <div className="pfoot" style={{ justifyContent: "flex-end" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--pri)" }}>Xem kế hoạch ›</span>
      </div>
    </div>
  )
}

export default PlanCard
