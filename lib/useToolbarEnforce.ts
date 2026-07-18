"use client"

import { useEffect } from "react"

// Port lai 3 ham JS toan cuc tu ban HTML goc (enforceToolbar, reorgBookingToolbar,
// enforceTableFit) chay khi mount, khi resize, va qua MutationObserver theo doi
// toan bo DOM -- giong cach ban goc chay 1 script scan() toan cuc.

function setImportant(el: HTMLElement, prop: string, value: string) {
  el.style.setProperty(prop, value, "important")
}

function enforceToolbar() {
  if (window.innerWidth > 820) return
  const toolbars = document.querySelectorAll<HTMLElement>(".ch.ch-toolbar")
  toolbars.forEach((tb) => {
    setImportant(tb, "display", "flex")
    setImportant(tb, "flex-direction", "column")
    setImportant(tb, "align-items", "stretch")
    setImportant(tb, "gap", "10px")
    setImportant(tb, "padding-left", "14px")
    setImportant(tb, "padding-right", "0px")
    setImportant(tb, "width", "auto")
    setImportant(tb, "box-sizing", "border-box")
    const cardWrap = tb.closest<HTMLElement>(".card")
    if (cardWrap) {
      setImportant(cardWrap, "padding-right", "0px")
      setImportant(cardWrap, "padding-left", "0px")
      setImportant(cardWrap, "overflow", "hidden")
    }
    const rows = tb.querySelectorAll<HTMLElement>(':scope > .row, :scope > div[style*="display:flex"]')
    rows.forEach((r) => {
      setImportant(r, "display", "flex")
      setImportant(r, "flex-direction", "row")
      setImportant(r, "flex-wrap", "nowrap")
      setImportant(r, "width", "100%")
      setImportant(r, "gap", "8px")
      setImportant(r, "align-items", "center")
      setImportant(r, "justify-content", "flex-start")
      setImportant(r, "padding", "0")
      setImportant(r, "margin", "0")
      Array.from(r.children).forEach((child) => {
        const el = child as HTMLElement
        if (el.tagName === "INPUT" && /-search$/.test(el.id || "")) {
          setImportant(el, "flex", "1 1 auto")
          setImportant(el, "flex-grow", "1")
          setImportant(el, "flex-basis", "auto")
          setImportant(el, "flex-shrink", "1")
          setImportant(el, "order", "0")
          setImportant(el, "width", "auto")
          setImportant(el, "min-width", "0")
          setImportant(el, "max-width", "none")
          setImportant(el, "margin", "0")
        } else if (el.tagName === "BUTTON") {
          setImportant(el, "flex", "0 0 auto")
          setImportant(el, "flex-grow", "0")
          setImportant(el, "flex-basis", "auto")
          setImportant(el, "order", "1")
          setImportant(el, "margin", "0")
        }
      })
    })
  })

  const qlv = document.querySelector<HTMLElement>("#ql-view > div")
  if (qlv) {
    setImportant(qlv, "display", "flex")
    setImportant(qlv, "flex-direction", "column")
    setImportant(qlv, "align-items", "stretch")
    setImportant(qlv, "gap", "10px")
    const inner = qlv.querySelector<HTMLElement>(":scope > div")
    if (inner) {
      setImportant(inner, "display", "flex")
      setImportant(inner, "width", "100%")
      setImportant(inner, "gap", "8px")
      Array.from(inner.children).forEach((child) => {
        const el = child as HTMLElement
        if (el.tagName === "INPUT") {
          setImportant(el, "flex", "1 1 auto")
          setImportant(el, "order", "0")
          setImportant(el, "width", "auto")
          setImportant(el, "min-width", "0")
          setImportant(el, "max-width", "none")
        } else if (el.tagName === "BUTTON") {
          setImportant(el, "flex", "0 0 auto")
          setImportant(el, "order", "1")
        }
      })
    }
  }
}

function enforceTableFit() {
  const card =
    document.querySelector<HTMLElement>("#pm-detail-shell:not(.hidden) .center-detail-card") ||
    document.querySelector<HTMLElement>(".center-detail-card")
  if (!card) return
  const page = card.closest<HTMLElement>('section[id^="page-"]')
  let siblingsAfter = 0
  if (page) {
    let n: Element | null = card
    while (n && n.nextElementSibling) {
      n = n.nextElementSibling
      if (n.classList && (n.classList.contains("card") || n.classList.contains("center-detail-card"))) siblingsAfter++
    }
  }
  const box = card.querySelector<HTMLElement>("#pm-detail-scrollbox") || card.querySelector<HTMLElement>(".qs-box")
  if (siblingsAfter > 0) {
    card.style.removeProperty("max-height")
    card.style.removeProperty("overflow")
    if (box) box.style.removeProperty("max-height")
    return
  }
  setImportant(card, "display", "flex")
  setImportant(card, "flex-direction", "column")
  setImportant(card, "overflow", "hidden")
  const rect = card.getBoundingClientRect()
  const vh = window.innerHeight
  const maxH = Math.max(320, vh - rect.top - 24)
  setImportant(card, "max-height", `${maxH}px`)
  if (box) {
    setImportant(box, "flex", "1 1 auto")
    setImportant(box, "min-height", "200px")
    setImportant(box, "max-height", "none")
    setImportant(box, "overflow", "auto")
  }
}

function reorgBookingToolbar() {
  const nav = document.querySelector<HTMLElement>(".eqdatenav")
  const chips = document.getElementById("eq-cat-chips")
  if (!nav || !chips) return
  const card = nav.parentElement
  const pick = nav.querySelector<HTMLElement>(".eqdatenav-pick")
  const prev = document.getElementById("eq-date-prev")
  const next = document.getElementById("eq-date-next")
  const zoom = document.getElementById("eq-view-zoom")
  const today = document.getElementById("eq-date-today")
  if (window.innerWidth <= 820) {
    if (chips.parentElement !== nav) nav.insertBefore(chips, nav.firstChild)
    setImportant(chips, "order", "-1")
    setImportant(chips, "margin", "0")
    setImportant(chips, "flex", "0 0 auto")
    setImportant(chips, "min-width", "0")
    if (pick) setImportant(pick, "display", "none")
    if (prev) setImportant(prev, "display", "none")
    if (next) setImportant(next, "display", "none")
    setImportant(nav, "display", "flex")
    setImportant(nav, "flex-direction", "row")
    setImportant(nav, "flex-wrap", "nowrap")
    setImportant(nav, "gap", "8px")
    setImportant(nav, "align-items", "center")
    setImportant(nav, "justify-content", "flex-start")
    setImportant(nav, "overflow-x", "auto")
    setImportant(nav, "padding", "0")
    setImportant(nav, "margin", "0")
    setImportant(nav, "width", "100%")
    if (zoom) {
      setImportant(zoom, "flex", "1 1 auto")
      setImportant(zoom, "min-width", "0")
    }
    if (today) {
      setImportant(today, "flex", "0 0 auto")
      setImportant(today, "white-space", "nowrap")
    }
  } else {
    if (chips.parentElement === nav && card) card.insertBefore(chips, nav.nextSibling)
    chips.style.removeProperty("order")
    chips.style.removeProperty("margin")
    chips.style.removeProperty("flex")
    if (pick) pick.style.removeProperty("display")
    if (prev) prev.style.removeProperty("display")
    if (next) next.style.removeProperty("display")
    nav.style.removeProperty("flex-wrap")
    nav.style.removeProperty("overflow-x")
  }
}

function runAll() {
  enforceToolbar()
  reorgBookingToolbar()
  enforceTableFit()
}

/**
 * Hook dung chung ap dung 3 quy tac chuan hoa toolbar/nut dieu huong tren
 * mobile (toolbar doc, gop chip danh muc vao thanh dieu huong ngay, gioi han
 * chieu cao khung chi tiet trung tam), chay khi mount, khi resize, va theo
 * doi thay doi DOM qua MutationObserver -- dung 1 lan o layout goc cho toan
 * bo trang.
 */
export function useToolbarEnforce() {
  useEffect(() => {
    runAll()
    const onResize = () => runAll()
    window.addEventListener("resize", onResize)
    const mo = new MutationObserver(() => runAll())
    if (document.body) mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      window.removeEventListener("resize", onResize)
      mo.disconnect()
    }
  }, [])
}
