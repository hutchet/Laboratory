import type { ReactNode, MouseEventHandler } from "react"

export type IconButtonVariant = "ghost" | "danger"

export type IconButtonProps = {
  icon: string        // Material Symbols name
  onClick?: MouseEventHandler<HTMLButtonElement>
  title?: string
  variant?: IconButtonVariant
  size?: number
  type?: "button" | "submit" | "reset"
}

/**
 * Nút icon chuẩn Material Design 3 — không background mặc định.
 * variant="danger" chuyển màu đỏ khi hover.
 */
export function IconButton({ icon, onClick, title, variant = "ghost", size = 32, type = "button" }: IconButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={`icon-btn-md3${variant === "danger" ? " danger" : ""}`}
      style={{ width: size, height: size }}
    >
      <span className="msr">{icon}</span>
    </button>
  )
}

export default IconButton
