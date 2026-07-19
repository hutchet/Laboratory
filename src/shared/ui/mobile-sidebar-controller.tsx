"use client"

// Port 1:1 tu doan JS "v106 - mobile sidebar off-canvas drawer" ban goc
// (taskflow_original.html dong ~8215-8237): vuot tu canh trai man hinh de mo sidebar,
// vuot trai de dong, bam ra ngoai (backdrop) de dong, bam 1 muc menu tren mobile thi tu
// dong dong, resize ve desktop thi tu dong dong. CSS tuong ung (.side.v106-open,
// .v106-side-backdrop) da co san trong globals.css tu truoc nhung chua duoc noi JS nao
// — component nay noi day chinh xac hanh vi do, khong doi lai logic.

import { useEffect } from "react"

const MOBILE_MAX_WIDTH = 820
const SWIPE_THRESHOLD = 60
const EDGE_ZONE = 24

export function MobileSidebarController() {
  useEffect(() => {
    const side = document.querySelector<HTMLElement>(".side")
    if (!side) return undefined

    let backdrop = document.querySelector<HTMLElement>(".v106-side-backdrop")
    let createdBackdrop = false
    if (!backdrop) {
      backdrop = document.createElement("div")
      backdrop.className = "v106-side-backdrop"
      document.body.appendChild(backdrop)
      createdBackdrop = true
    }
    const backdropEl = backdrop

    const isMobile = () => window.innerWidth <= MOBILE_MAX_WIDTH
    const openSide = () => {
      side.classList.add("v106-open")
      backdropEl.classList.add("show")
    }
    const closeSide = () => {
      side.classList.remove("v106-open")
      backdropEl.classList.remove("show")
    }

    const onBackdropClick = () => closeSide()
    backdropEl.addEventListener("click", onBackdropClick)

    const navEls = Array.from(side.querySelectorAll<HTMLElement>("a,button,.nav"))
    const onNavClick = () => {
      if (isMobile()) closeSide()
    }
    navEls.forEach((el) => el.addEventListener("click", onNavClick))

    let touchStartX: number | null = null
    let touchStartY: number | null = null
    let tracking = false

    const onTouchStart = (e: TouchEvent) => {
      if (!isMobile()) return
      const t = e.touches[0]
      if (!t) return
      touchStartX = t.clientX
      touchStartY = t.clientY
      const openNow = side.classList.contains("v106-open")
      tracking = openNow || touchStartX <= EDGE_ZONE
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking || !isMobile() || touchStartX === null || touchStartY === null) return
      const t = e.touches[0]
      if (!t) return
      const dx = t.clientX - touchStartX
      const dy = t.clientY - touchStartY
      if (Math.abs(dy) > Math.abs(dx)) return
      const openNow = side.classList.contains("v106-open")
      if (!openNow && dx > SWIPE_THRESHOLD) openSide()
      else if (openNow && dx < -SWIPE_THRESHOLD) closeSide()
    }
    const onTouchEnd = () => {
      tracking = false
      touchStartX = null
      touchStartY = null
    }
    const onResize = () => {
      if (!isMobile()) closeSide()
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true })
    document.addEventListener("touchmove", onTouchMove, { passive: true })
    document.addEventListener("touchend", onTouchEnd)
    window.addEventListener("resize", onResize)

    return () => {
      backdropEl.removeEventListener("click", onBackdropClick)
      navEls.forEach((el) => el.removeEventListener("click", onNavClick))
      document.removeEventListener("touchstart", onTouchStart)
      document.removeEventListener("touchmove", onTouchMove)
      document.removeEventListener("touchend", onTouchEnd)
      window.removeEventListener("resize", onResize)
      if (createdBackdrop) backdropEl.remove()
    }
  }, [])

  return null
}
