import type { MouseEventHandler } from "react"
import { DirectionIcon } from "@/shared/ui/icons"

export type PlanCardProps = {
  projectName: string
  status: string
  packCount: number
  itemCount: number
  passCount: number
  doneCount: number
  avgProgress: number
  onClick?: MouseEventHandler<HTMLDivElement>
}

/**
 * The tong quan ke hoach thu nghiem theo du an - trang danh sach ke hoach (PlanView)
 * khi chua chon 1 du an cu the. Port 1:1 cua renderPlanCardOverview() ban goc
 * (taskflow_original.html dong 7216-7219): dung class ".hub-card" (GIONG AuditPlan/
 * Equipment/QuoteMatrix hub-card - KHONG dung ".pcard" nhu the du an o trang Du an).
 * Cau truc dung 1:1 theo HTML goc:
 *  - hub-top: icon 2 chu dau ten du an + ten + trang thai ke hoach + mui ten
 *  - hub-tags: 3 tag rieng "N mau" / "N bai thu" / "N dat"
 *  - plan-card-progress: dong "Tien do ke hoach" + % + thanh bar
 *  - hub-stats: 3 o so lieu lon o duoi "Bai thu" / "Dat" / "Hoan tat" (x/y)
 */
export function PlanCard({ projectName, status, packCount, itemCount, passCount, doneCount, avgProgress, onClick }: PlanCardProps) {
  const initial = (projectName || "DA").trim().slice(0, 2).toUpperCase()
  return (
    <div
      className="hub-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>) }}
    >
      <div className="hub-top">
        <div className="hub-icon">{initial}</div>
        <div className="hub-title">
          <h4>{projectName}</h4>
          <p>{status}</p>
        </div>
        <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
      </div>
      <div className="hub-tags">
        <span className="hub-tag">{packCount} mẫu</span>
        <span className="hub-tag">{itemCount} bài thử</span>
        <span className="hub-tag">{passCount} đạt</span>
      </div>
      <div className="plan-card-progress">
        <div className="line"><span>Tiến độ kế hoạch</span><b>{avgProgress}%</b></div>
        <div className="bar"><i style={{ width: `${avgProgress}%` }} /></div>
      </div>
      <div className="hub-stats">
        <div className="hub-stat"><b>{itemCount}</b><span>Bài thử</span></div>
        <div className="hub-stat"><b style={{ color: "var(--green)" }}>{passCount}</b><span>Đạt</span></div>
        <div className="hub-stat"><b>{doneCount}/{itemCount}</b><span>Hoàn tất</span></div>
      </div>
    </div>
  )
}

export default PlanCard
