"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { can, type ActionName } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"
import { exportFullBackup, importFullBackup, wipeAllBusinessData, type FullBackup } from "./backup"
import { SIM_ROLE_COOKIE } from "./role-sim"
import { LANG_COOKIE } from "@/shared/lib/i18n"
import type { FontKey, Language, SimRole, ThemeMode } from "./types"

const YEAR = 60 * 60 * 24 * 365
const THEME_MODE_COOKIE = "tf_theme_v1_mode"
const THEME_FONT_COOKIE = "tf_theme_v1_font"
const LAST_BACKUP_COOKIE = "tf_eq_last_backup_v1"

async function requireLogin(): Promise<string> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  return userId
}

async function requireSettingsPermission(action: ActionName): Promise<string> {
  const userId = await requireLogin()
  const allowed = await can(userId, "settings", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
  return userId
}

// #set-th-mode / #set-font (đổi ngay khi chọn, dòng 7639+ bản gốc) — chỉ là tuỳ
// chọn hiển thị cá nhân trên trình duyệt, không cần quyền module riêng.
export async function saveTheme(input: { mode: ThemeMode; font: FontKey }) {
  await requireLogin()
  const jar = await cookies()
  jar.set(THEME_MODE_COOKIE, input.mode, { path: "/", maxAge: YEAR })
  jar.set(THEME_FONT_COOKIE, input.font, { path: "/", maxAge: YEAR })
  revalidatePath("/", "layout")
}

// #set-theme-reset: theme={mode:'light',font:'default'} (bản gốc)
export async function resetTheme() {
  await requireLogin()
  const jar = await cookies()
  jar.set(THEME_MODE_COOKIE, "light", { path: "/", maxAge: YEAR })
  jar.set(THEME_FONT_COOKIE, "default", { path: "/", maxAge: YEAR })
  revalidatePath("/", "layout")
}

// Port từ select data-vf-pref="lang" (v103SettingsPreferences(), dòng 8139 bản gốc) —
// lưu cookie ngôn ngữ hiển thị, áp dụng qua I18nApplier (shared/ui/i18n-applier.tsx).
export async function saveLanguage(lang: Language) {
  await requireLogin()
  const jar = await cookies()
  jar.set(LANG_COOKIE, lang, { path: "/", maxAge: YEAR })
  revalidatePath("/", "layout")
}

// #set-active-role (dòng 7639-7640 bản gốc) — xem ghi chú trong role-sim.ts
export async function setSimRole(role: SimRole) {
  await requireLogin()
  const jar = await cookies()
  if (role) jar.set(SIM_ROLE_COOKIE, role, { path: "/", maxAge: YEAR })
  else jar.delete(SIM_ROLE_COOKIE)
  revalidatePath("/", "layout")
}

// #set-backup-btn -> doFullBackup() (dòng 6784 bản gốc)
export async function requestFullBackup(): Promise<FullBackup> {
  await requireSettingsPermission("view")
  const data = await exportFullBackup()
  const jar = await cookies()
  jar.set(LAST_BACKUP_COOKIE, new Date().toISOString(), { path: "/", maxAge: YEAR })
  await logAudit("settings", "other", "full-backup", "Tải xuống bản sao lưu toàn bộ dữ liệu")
  revalidatePath("/settings")
  return data
}

// #set-restore-btn / #set-file-restore -> doFullRestore() (dòng 6793 bản gốc): THAY
// THẾ toàn bộ dữ liệu hiện tại bằng dữ liệu trong file backup.
export async function restoreFullBackup(data: FullBackup) {
  await requireSettingsPermission("edit")
  if (!data || typeof data !== "object" || !data.tables) {
    throw new Error("File không hợp lệ")
  }
  const counts = await importFullBackup(data)
  await logAudit("settings", "update", "full-backup", "Khôi phục dữ liệu từ file sao lưu (thay thế toàn bộ)")
  revalidatePath("/", "layout")
  return counts
}

// #set-clear-btn (double-confirm xử lý ở client trước khi gọi action này) — xoá
// TOÀN BỘ dữ liệu nghiệp vụ (không động tới tài khoản đăng nhập/phân quyền).
export async function clearAllData() {
  await requireSettingsPermission("delete")
  await wipeAllBusinessData()
  await logAudit("settings", "delete", "full-data", "Xoá toàn bộ dữ liệu nghiệp vụ")
  revalidatePath("/", "layout")
}
