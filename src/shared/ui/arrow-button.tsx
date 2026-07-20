import type { CSSProperties } from "react"
import { DirectionIcon, type DirectionIconName } from "./icons"

export type ArrowButtonProps = {
  direction: DirectionIconName // "chevronLeft" | "chevronRight" | "chevronUp" | "chevronDown"
  onClick?: () => void
  disabled?: boolean
  ariaLabel?: string
  style?: CSSProperties
}

/**
 * Nut mui ten dieu huong dung chung cho toan he thong (phan trang, dieu huong
 * ngay/thang/nam trong Gantt, v.v.) - nen vuong bo tron giong nut mo "Ke hoach
 * thu nghiem" tren the du an va mui ten droplist.
 *
 * Dung lai dung 2 class CSS goc `sys-arrow-control` / `sys-arrow-glyph`
 * (globals.css ~line 1611) de nen mui ten luon dong bo toan he thong - moi
 * lan can nut mui ten doc lap (khong thuoc droplist), goi component nay ra
 * thay vi tu ve nut rieng.
 */
export function ArrowButton({ direction, onClick, disabled, ariaLabel, style }: ArrowButtonProps) {
  return (
    <button
      type="button"
      className="sys-arrow-control"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? "default" : "pointer", ...style }}
    >
      <span className="sys-arrow-glyph">
        <DirectionIcon name={direction} size={20} />
      </span>
    </button>
  )
}

export default ArrowButton
