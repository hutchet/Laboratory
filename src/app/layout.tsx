import type { ReactNode } from "react"
import { cookies } from "next/headers"
import "./globals.css"
import { fontStackFor } from "@/features/settings/types"
import type { FontKey, Language, ThemeMode } from "@/features/settings/types"
import { LANG_COOKIE } from "@/shared/lib/i18n"
import { I18nApplier } from "@/shared/ui/i18n-applier"

export const metadata = { title: "TaskFlow", description: "TaskFlow v2" }

// Script chan render (dat truoc <body>), port 1:1 y tuong vfDevicePrefMode()/
// vfSystemPrefersDark() ban goc (dong ~7530-7534, 8207): khi mode="device" thi
// doc matchMedia('(prefers-color-scheme:dark)') ngay truoc khi ve trang de tranh
// nhap nhay, va tiep tuc lang nghe thay doi de cap nhat song song voi he dieu hanh.
const DEVICE_THEME_SCRIPT = `(function(){try{
  var pref = document.documentElement.getAttribute('data-theme-pref');
  function apply(){
    if(pref==='device'){
      var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    }
  }
  apply();
  if(pref==='device' && window.matchMedia){
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', apply);
  }
}catch(e){}})();`

// Áp dụng chế độ Sáng/Tối/Theo thiết bị + phông chữ ngay từ server render để tránh nhấp nháy
// (tương ứng applyTheme() đặt document.documentElement.dataset.theme + body.style.fontFamily,
// dòng 7509-7515 bản gốc) — nhưng đọc từ cookie (tf_theme_v1_mode/tf_theme_v1_font, xem
// features/settings) thay cho localStorage THKEY. mode="device" được xử lý bởi
// DEVICE_THEME_SCRIPT (matchMedia, không thể biết ở server). class "material-3" trên
// <body> luôn bật sẵn, port từ <body class="material-3"> tĩnh trong bản gốc (dòng 3090).
export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies()
  const modeRaw = jar.get("tf_theme_v1_mode")?.value
  const mode: ThemeMode = modeRaw === "dark" ? "dark" : modeRaw === "device" ? "device" : "light"
  const fontRaw = jar.get("tf_theme_v1_font")?.value as FontKey | undefined
  const font: FontKey = fontRaw === "roboto" || fontRaw === "serif" || fontRaw === "mono" ? fontRaw : "default"
  const lang: Language = jar.get(LANG_COOKIE)?.value === "en" ? "en" : "vi"
  const initialTheme = mode === "device" ? undefined : mode

  return (
    <html lang={lang} data-theme={initialTheme} data-theme-pref={mode}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DEVICE_THEME_SCRIPT }} />
      </head>
      <body className="material-3" style={{ fontFamily: fontStackFor(font) }}>
        {children}
        <I18nApplier lang={lang} />
      </body>
    </html>
  )
}
