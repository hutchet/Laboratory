import type { ChangeEvent } from "react"

export type SearchInputProps = {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  width?: number | string
}

/**
 * Chuẩn chung toàn hệ thống — dùng CSS class `.search` từ globals.css
 * MD3 tự override: surface-container-high, border-radius 24px, height 48px
 */
export function SearchInput({ value, onChange, placeholder = "Tìm kiếm...", width = 220 }: SearchInputProps) {
  return (
    <div className="search" style={{ width }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="7" />
        <line x1="16.5" y1="16.5" x2="21" y2="21" />
      </svg>
      <input
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

export default SearchInput
