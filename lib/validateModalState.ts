// Ha tang dung chung: xac thuc trang thai modal/form truoc khi cho phep luu.
// Ban goc khong co 1 ham xac thuc tap trung - moi form tu kiem tra rai rac (hoac khong kiem tra).
// Day la lop xac thuc dung chung moi, ap dung dan cho cac modal quan trong (Equipment truoc,
// mo rong dan sau) de tranh luu du lieu thieu/sai vao Postgres.

export type ValidationRule<T = unknown> = (value: T, allValues: Record<string, unknown>) => string | null

export type ValidationSchema = Record<string, ValidationRule[]>

export type ValidationResult = {
  valid: boolean
  errors: Record<string, string>
  // Danh sach thong bao gop lai, dung de hien 1 dong tom tat neu can
  firstError: string | null
}

/**
 * Chay tap hop cac rule xac thuc tren 1 bo gia tri form/modal.
 * Vi du:
 *   validateModalState({ name: "", qty: -1 }, {
 *     name: [required("Ten thiet bi khong duoc de trong")],
 *     qty: [min(0, "So luong khong duoc am")],
 *   })
 */
export function validateModalState(values: Record<string, unknown>, schema: ValidationSchema): ValidationResult {
  const errors: Record<string, string> = {}
  for (const field of Object.keys(schema)) {
    const rules = schema[field] ?? []
    const value = values[field]
    for (const rule of rules) {
      const message = rule(value, values)
      if (message) {
        errors[field] = message
        break
      }
    }
  }
  const errorFields = Object.keys(errors)
  return {
    valid: errorFields.length === 0,
    errors,
    firstError: errorFields.length ? errors[errorFields[0]] : null,
  }
}

export function required(message = "Truong nay khong duoc de trong"): ValidationRule {
  return (value) => {
    if (value === null || value === undefined) return message
    if (typeof value === "string" && value.trim() === "") return message
    return null
  }
}

export function min(minValue: number, message?: string): ValidationRule<number | string> {
  return (value) => {
    const n = typeof value === "string" ? Number(value) : value
    if (typeof n !== "number" || Number.isNaN(n)) return null
    if (n < minValue) return message ?? `Gia tri khong duoc nho hon ${minValue}`
    return null
  }
}

export function max(maxValue: number, message?: string): ValidationRule<number | string> {
  return (value) => {
    const n = typeof value === "string" ? Number(value) : value
    if (typeof n !== "number" || Number.isNaN(n)) return null
    if (n > maxValue) return message ?? `Gia tri khong duoc lon hon ${maxValue}`
    return null
  }
}
