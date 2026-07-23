// Kiểu dữ liệu cho module Cài đặt (Settings) — port từ theme/FONT_OPTIONS/CUR_ROLE_KEY
// (dòng 5417, 7522-7530 taskflow_original.html) và HTML #page-settings (dòng 3958-4004).
//
// v2 bổ sung: "device" cho ThemeMode (mode:'device' dùng matchMedia('(prefers-color-scheme:dark)'),
// dòng 8139/8207 bản gốc — trước đây chỉ port Sáng/Tối thủ công) và Language (vi/en, dòng 8143-8195
// bản gốc VF_DICT/vfApplyI18n — trước đây chưa port ngôn ngữ).

export type ThemeMode = "light" | "dark" | "device"
export type FontKey = "default" | "roboto" | "serif" | "mono"
export type Language = "vi" | "en"

// Đơn vị tiền tệ hiển thị (yêu cầu 23/07, 5:36 chiều) — re-export từ shared/lib/currency để
// AppSettings dùng chung 1 nguồn duy nhất, tránh khai báo trùng "VND"|"USD"|... ở 2 nơi.
import type { Currency } from "@/shared/lib/currency"
export type { Currency }
export { CURRENCY_OPTIONS } from "@/shared/lib/currency"

export type FontOption = { key: FontKey; label: string; stack: string }

// Giữ nguyên 4 lựa chọn + font-family stack đúng ý bản gốc (FONT_OPTIONS, dòng 7524-7529).
export const FONT_OPTIONS: FontOption[] = [
  { key: "default", label: "Mặc định (Inter)", stack: "'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif" },
  { key: "roboto", label: "Roboto", stack: "Roboto,'Segoe UI',Helvetica,Arial,sans-serif" },
  { key: "serif", label: "Serif (Georgia)", stack: "Georgia,'Times New Roman',serif" },
  { key: "mono", label: "Monospace", stack: "'Courier New',Consolas,monospace" },
]

export function fontStackFor(key: FontKey): string {
  return FONT_OPTIONS.find((f) => f.key === key)?.stack || FONT_OPTIONS[0].stack
}

export type AppTheme = { mode: ThemeMode; font: FontKey }

// Giả lập vai trò CHỈ ở lớp hiển thị UI (xem role-sim.ts). "" = theo vai trò thật của tài khoản.
// Nâng cấp lên 6 cấp bậc (thiết kế: Tài khoản 6 cấp bậc + Phân vùng dữ liệu theo Trung
// tâm thử nghiệm & Nhóm vận hành).
export type SimRole = "" | "director" | "dept_head" | "team_lead" | "engineer" | "technician" | "viewer"

export const SIM_ROLE_OPTIONS: Array<{ value: SimRole; label: string }> = [
  { value: "", label: "Theo Quản trị viên mặc định" },
  { value: "director", label: "Giám đốc" },
  { value: "dept_head", label: "Trưởng phòng" },
  { value: "team_lead", label: "Trưởng nhóm" },
  { value: "engineer", label: "Kỹ sư" },
  { value: "technician", label: "Kỹ thuật viên" },
  { value: "viewer", label: "Người xem" },
]

// Port đúng 2 lựa chọn ngôn ngữ có trong VF_DICT/select data-vf-pref="lang" bản gốc (dòng 8139).
export const LANGUAGE_OPTIONS: Array<{ value: Language; label: string }> = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
]

export type AppSettings = {
  theme: AppTheme
  language: Language
  currency: Currency
  simRole: SimRole
  activeRoleLabel: string
  lastBackupAt: string | null
  canBackup: boolean
  canRestore: boolean
  canWipe: boolean
}
