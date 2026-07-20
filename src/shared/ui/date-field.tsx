// Chuẩn hóa "box chọn thời gian" — ô nhập ngày dùng chung style bo góc + nền var(--surface-control)
// giống các control khác trong thư viện (SearchInput/CustomSelect). Dùng cho các field ngày trong
// form (VD: Ngày bắt đầu / Ngày kết thúc ở trang Dự án). Icon lịch dùng icon mặc định của trình duyệt
// cho input[type=date] (không cần SVG riêng), chỉ chuẩn hóa khung/màu nền/bo góc.
export type DateFieldProps = {
  name?: string
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  required?: boolean
  min?: string
  max?: string
  style?: React.CSSProperties
}

export function DateField({ name, defaultValue, value, onChange, required, min, max, style }: DateFieldProps) {
  const isControlled = value !== undefined
  return (
    <input
      type="date"
      name={name}
      required={required}
      min={min}
      max={max}
      className="sys-date-field"
      style={style}
      {...(isControlled
        ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value) }
        : { defaultValue })}
    />
  )
}

export default DateField
