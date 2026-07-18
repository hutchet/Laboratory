"use client"
import { useEffect } from "react"

// Tai hien dung hanh vi bam Escape de dong modal/popup nhu ban goc:
// document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); })
// Goi hook nay trong bat ky component co state dang/sua (form, popup, drill-down) dang mo.
// `active` = dieu kien modal/popup dang hien; `onClose` = ham dong lai (set state ve false/null).
export function useEscapeClose(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [active, onClose])
}
