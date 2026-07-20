import type { MouseEventHandler } from "react"
import { IconButton } from "./icon-button"
import { AvatarInitials } from "./avatar-initials"

export type ProjectCardProps = {
  id: string
  name: string
  statusLabel: string
  statusBg: string
  statusColor: string
  priorityLabel: string
  priorityColor: string
  priorityBg?: string
  progress: number          // 0-100
  taskDone: number
  taskTotal: number
  taskOverdue?: number
  planInfo?: string | null   // null = chưa có kế hoạch
  onPlanClick?: MouseEventHandler<HTMLButtonElement>
  avatars?: { name: string; color: string }[]
  dueDate?: string
  onEdit?: MouseEventHandler<HTMLButtonElement>
  onDelete?: MouseEventHandler<HTMLButtonElement>
}

/**
 * Thẻ dự án chuẩn MD3. Dùng CSS class `pcard` từ globals.css.
 * Toàn hệ thống chỉ thay đổi file này để cập nhật giao diện thẻ dự án.
 */
export function ProjectCard({
  name, statusLabel, statusBg, statusColor,
  priorityLabel, priorityColor, priorityBg,
  progress, taskDone, taskTotal, taskOverdue,
  planInfo, onPlanClick,
  avatars = [], dueDate,
  onEdit, onDelete,
}: ProjectCardProps) {
  return (
    <div className="pcard">
      {/* Header: tên + actions */}
      <div className="pt">
        <h4>{name}</h4>
        <div className="pacts">
          <IconButton icon="edit" onClick={onEdit} title="Sửa" variant="ghost" size={30} />
          <IconButton icon="delete" onClick={onDelete} title="Xoá" variant="danger" size={30} />
        </div>
      </div>

      {/* Badges: trạng thái + ưu tiên */}
      <div className="tags">
        <span className="pcard-badge" style={{ background: statusBg, color: statusColor }}>
          {statusLabel}
        </span>
        <span className="pcard-badge" style={{ background: priorityBg ?? "var(--md-sys-color-tertiary-container,#ffddb3)", color: priorityColor }}>
          {priorityLabel}
        </span>
      </div>

      {/* Tiến độ */}
      <div className="pbox">
        <div className="prow">
          <span>Tiến độ</span>
          <b>{progress}%</b>
        </div>
        <div className="pbar"><i style={{ width: `${progress}%` }} /></div>
        <div className="pbox-sub">
          {taskDone}/{taskTotal} công việc hoàn thành
          {taskOverdue ? <span className="overdue"> · {taskOverdue} quá hạn</span> : null}
        </div>
      </div>

      {/* Kế hoạch thử nghiệm */}
      <div className="plan-info">
        {planInfo ? (
          <button type="button" onClick={onPlanClick} className="plan-link">
            {planInfo} ›
          </button>
        ) : (
          <span className="plan-empty">Chưa có kế hoạch thử nghiệm</span>
        )}
      </div>

      {/* Footer: avatars + hạn */}
      <div className="pfoot">
        <div className="avstack">
          {avatars.map((a, i) => (
            <AvatarInitials key={i} name={a.name} size={28} />
          ))}
        </div>
        {dueDate && <span className="due">Hạn: {dueDate}</span>}
      </div>
    </div>
  )
}

export default ProjectCard
