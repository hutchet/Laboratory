"use client"

// Phuc dung dung 2 he thong JS toan cuc cua ban goc: nhan dien do phan giai man hinh
// (gan html[data-viewport]) va sidebar drawer mobile (v106SidebarDrawer) - xem
// taskflow_original.html dong ~7523 (vfDevicePrefMode khu vuc) va dong ~8211 (v106SidebarDrawer).
import { useEffect } from "react"

export default function ResponsiveController() {
  useEffect(() => {
    function applyViewport() {
      const w = window.innerWidth
      const v = w <= 820 ? "mobile" : w <= 1180 ? "tablet" : "desktop"
      document.documentElement.setAttribute("data-viewport", v)
    }
    applyViewport()
    window.addEventListener("resize", applyViewport)

    const side = document.querySelector(".side") as HTMLElement | null
    if (!side) {
      return () => window.removeEventListener("resize", applyViewport)
    }

    function isMobile() {
      return window.innerWidth <= 820
    }

    const backdrop = document.createElement("div")
    backdrop.className = "v106-side-backdrop"
    ;(side.parentElement || document.body).appendChild(backdrop)

    function openSide() {
      side!.classList.add("v106-open")
      backdrop.classList.add("show")
    }
    function closeSide() {
      side!.classList.remove("v106-open")
      backdrop.classList.remove("show")
    }
    ;(window as unknown as { __tfToggleSidebar?: () => void }).__tfToggleSidebar = () => {
      if (side!.classList.contains("v106-open")) closeSide()
      else openSide()
    }

    backdrop.addEventListener("click", closeSide)
    const navButtons = Array.from(side.querySelectorAll(".nav"))
    function onNavClick() {
      if (isMobile()) closeSide()
    }
    navButtons.forEach((btn) => btn.addEventListener("click", onNavClick))

    let touchStartX = 0
    let touchStartY = 0
    let tracking = false
    function onTouchStart(e: TouchEvent) {
      if (!isMobile()) return
      const t = e.touches[0]
      touchStartX = t.clientX
      touchStartY = t.clientY
      // Chi bat dau tracking neu vuot tu canh trai (mo sidebar) hoac sidebar dang mo (dong sidebar)
      tracking = (!side!.classList.contains("v106-open") && touchStartX <= 30) || side!.classList.contains("v106-open")
    }
    function onTouchMove(e: TouchEvent) {
      if (!tracking || !isMobile()) return
      const t = e.touches[0]
      const dx = t.clientX - touchStartX
      const dy = t.clientY - touchStartY
      // Bo qua neu vuot doc
      if (Math.abs(dy) > Math.abs(dx)) return
      // Ngan browser back gesture khi dang xu ly sidebar swipe
      e.preventDefault()
      if (!side!.classList.contains("v106-open") && dx > 50) openSide()
      if (side!.classList.contains("v106-open") && dx < -50) closeSide()
    }
    function onTouchEnd() {
      tracking = false
    }
    // passive: false de co the goi preventDefault() trong onTouchMove
    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: false })
    document.addEventListener("touchend", onTouchEnd)

    function onResize() {
      if (!isMobile()) closeSide()
    }
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", applyViewport)
      window.removeEventListener("resize", onResize)
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
      navButtons.forEach((btn) => btn.removeEventListener("click", onNavClick))
      backdrop.removeEventListener("click", closeSide)
      backdrop.remove()
    }
  }, [])

  return null
}
