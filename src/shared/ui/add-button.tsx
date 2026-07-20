import type { MouseEventHandler } from "react"
import { ActionIcon } from "./icons"

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
      <ActionIcon name="add" size={18} />
      {label}
    </button>
  )
}

export default AddButton
