"use client"

// Client component port cua vfApplyI18n auto-run tren tung trang (ban goc goi lai
// vfApplyI18n() moi lan go() chuyen trang, dong ~8206). O day chay lai khi pathname
// doi (chuyen trang) hoac khi lang doi (nguoi dung luu Settings), de dam bao chu vi/en
// duoc quet lai tren noi dung moi render.

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { applyI18n } from "@/shared/lib/i18n"
type Language = "vi" | "en"

export function I18nApplier({ lang }: { lang: Language }) {
  const pathname = usePathname()

  useEffect(() => {
    if (lang === "en") {
      // Chay 2 lan (ngay + sau 1 tick) de bat ca noi dung render bat dong bo (client fetch).
      applyI18n("en")
      const t = setTimeout(() => applyI18n("en"), 60)
      return () => clearTimeout(t)
    }
    return undefined
  }, [lang, pathname])

  return null
}
