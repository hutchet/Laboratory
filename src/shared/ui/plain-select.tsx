import type { ReactNode, ChangeEventHandler, CSSProperties } from "react"
import { DirectionIcon } from "./icons"

// Boc chuan cho <select> goc cua trinh duyet: an mui ten mac dinh (appearance:none),
// thay bang lop nen rieng dung dung class ".sys-select-wrap"/".sys-select-arrow" da co
// san trong globals.css (v92 - GLOBAL DIRECTIONAL ICON REGISTRY) - dong bo voi
// CustomSelect va cac dropdown khac trong thu vien, thay vi de trinh duyet tu ve
// mui ten mac dinh khong co nen rieng.
export function PlainSelect({
  name,
  required,
  disabled,
  defaultValue,
  value,
  onChange,
  children,
  style,
  flex,
  wrapStyle,
}: {
  name?: string
  required?: boolean
  disabled?: boolean
  defaultValue?: string
  value?: string
  onChange?: ChangeEventHandler<HTMLSelectElement>
  children: ReactNode
  style?: CSSProperties
  flex?: number
  wrapStyle?: CSSProperties
}) {
  return (
    <div className="sys-select-wrap" style={{ marginTop: 4, flex, ...wrapStyle }}>
      <select
        name={name}
        required={required}
        disabled={disabled}
        {...(value !== undefined ? { value } : { defaultValue })}
        onChange={onChange}
        style={{
          padding: "8px 40px 8px 8px",
          borderRadius: 6,
          border: "1px solid #dfe3e8",
          background: "var(--surface-control, #fff)",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: 14,
          cursor: disabled ? "default" : "pointer",
          ...style,
        }}
      >
        {children}
      </select>
      <span className="sys-select-arrow">
        <DirectionIcon name="chevronDown" size={16} />
      </span>
    </div>
  )
}

export default PlainSelect
