import { cookies } from "next/headers"
import { auth } from "@/shared/lib/auth"
import { can, getUserRbacContext, type RankName } from "@/shared/lib/rbac"
import { PERM_LABELS } from "@/shared/lib/rbac-client"
import { getSimRole } from "./role-sim"
import { LANG_COOKIE } from "@/shared/lib/i18n"
import type { AppSettings, AppTheme, FontKey, Language, ThemeMode } from "./types"

const THEME_MODE_COOKIE = "tf_theme_v1_mode"
const THEME_FONT_COOKIE = "tf_theme_v1_font"
const LAST_BACKUP_COOKIE = "tf_eq_last_backup_v1"

// #set-th-mode / #set-font (đọc lại ở renderSettingsPage(), dòng 7633 bản gốc) —
// tuỳ chỉnh hiển thị cá nhân, lưu cookie thay cho localStorage (THKEY='tf_theme_v1').
// v2: mode bổ sung "device" (theo hệ điều hành, port từ vfDevicePrefMode() bản gốc).
export async function getTheme(): Promise<AppTheme> {
  const jar = await cookies()
  const modeRaw = jar.get(THEME_MODE_COOKIE)?.value
  const mode: ThemeMode = modeRaw === "dark" ? "dark" : modeRaw === "device" ? "device" : "light"
  const fontRaw = jar.get(THEME_FONT_COOKIE)?.value as FontKey | undefined
  const font: FontKey = fontRaw === "roboto" || fontRaw === "serif" || fontRaw === "mono" ? fontRaw : "default"
  return { mode, font }
}

// Port từ VF_DICT/data-vf-pref="lang" bản gốc (dòng 8139) — ngôn ngữ hiển thị UI, lưu cookie.
export async function getLanguage(): Promise<Language> {
  const jar = await cookies()
  return jar.get(LANG_COOKIE)?.value === "en" ? "en" : "vi"
}

export async function getSettings(): Promise<AppSettings> {
  const session = await auth()
  const jar = await cookies()
  const theme = await getTheme()
  const language = await getLanguage()
  const simRole = await getSimRole()

  let activeRoleLabel = PERM_LABELS.admin
  let canBackup = false
  let canRestore = false
  let canWipe = false

  if (session?.user?.id) {
    const userId = session.user.id
    const ctx = await getUserRbacContext(userId)
    const rank: RankName = simRole || ctx.rank
    activeRoleLabel = PERM_LABELS[rank]
    const [backupOk, restoreOk, wipeOk] = await Promise.all([
      can(userId, "settings", "view"),
      can(userId, "settings", "edit"),
      can(userId, "settings", "delete"),
    ])
    canBackup = backupOk
    canRestore = restoreOk
    canWipe = wipeOk
  }

  return {
    theme,
    language,
    simRole,
    activeRoleLabel,
    lastBackupAt: jar.get(LAST_BACKUP_COOKIE)?.value || null,
    canBackup,
    canRestore,
    canWipe,
  }
}
