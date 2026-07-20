import type { MouseEventHandler } from "react"

export type AddButtonProps = {
  label: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  type?: "button" | "submit" | "reset"
}

/**
 * Nút thêm mới chuẩn chung — màu primary, icon + label.
 * MD3 tự override style qua .btn-pri.
 */
export function AddButton({ label, onClick, type = "button" }: AddButtonProps) {
  return (
    <button type={type} onClick={onClick} className="btn-pri" style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      <span className="msr" style={{ fontSize: 18 }}>add</span>
      {label}
    </button>
  )
}

export default AddButton
