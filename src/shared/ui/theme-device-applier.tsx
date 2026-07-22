"use client"

// Sua loi "che do dark/light theo thiet bi khong hoat dong": DEVICE_THEME_SCRIPT
// trong app/layout.tsx (script inline dat truoc <body>) chi chay 1 lan luc parse
// HTML tho ban dau - khi nguoi dung DANG o trong app doi Cai dat sang "Theo thiet
// bi" (SettingsView -> saveTheme -> router.refresh()), React chi reconciling lai
// thuoc tinh data-theme-pref tren <html> (undefined -> "device") nhung KHONG chay
// lai noi dung script inline (dangerouslySetInnerHTML khong tu re-run khi re-render),
// nen data-theme khong duoc tinh lai tu matchMedia va che do Theo thiet bi "dung im"
// cho den khi tai lai (F5) trang. Component nay chay o client, re-apply moi khi
// prop mode doi (vi du refresh sau khi luu Cai dat), tuong tu I18nApplier.

import { useEffect } from "react"
import type { ThemeMode } from "@/features/settings/types"

export function ThemeDeviceApplier({ mode }: { mode: ThemeMode }) {
  useEffect(() => {
    if (mode !== "device" || typeof window === "undefined" || !window.matchMedia) return undefined
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light")
    }
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [mode])

  return null
}

export default ThemeDeviceApplier
