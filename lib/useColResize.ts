"use client"

import { useEffect } from "react"
import type { RefObject } from "react"

/**
 * Enables drag-to-resize table columns for a `.rz-table`, matching the
 * original taskflow HTML behavior (col-resizer handles + colgroup widths).
 * Re-applies whenever `colCount` changes (e.g. when a leading checkbox
 * column appears/disappears in edit mode).
 *
 * Shared version of app/(app)/quote/useColResize.ts for non-Quote pages
 * (Equipment, Purchase, Auditplan, Quote-matrix).
 */
export function useColResize(tableRef: RefObject<HTMLTableElement | null>, colCount: number) {
  useEffect(() => {
    const table = tableRef.current
    if (!table || colCount === 0) return

    table.querySelector("colgroup")?.remove()
    const cg = document.createElement("colgroup")
    for (let i = 0; i < colCount; i++) cg.appendChild(document.createElement("col"))
    table.insertBefore(cg, table.firstChild)

    const heads = Array.from(table.querySelectorAll("thead th")) as HTMLElement[]
    heads.forEach((th, i) => {
      th.querySelector(".col-resizer")?.remove()
      if (i === heads.length - 1) return // no handle on the last (Thao tác) column
      th.style.position = "relative"
      const span = document.createElement("span")
      span.className = "col-resizer"
      span.dataset.col = String(i)
      th.appendChild(span)
    })

    function onMouseDown(e: MouseEvent) {
      const handle = (e.target as HTMLElement).closest(".col-resizer") as HTMLElement | null
      if (!handle || !table!.contains(handle)) return
      e.preventDefault()
      const idx = Number(handle.dataset.col)
      const colgroup = table!.querySelector("colgroup")
      const col = colgroup?.children[idx] as HTMLElement | undefined
      const th = handle.closest("th") as HTMLElement
      if (!col || !th) return
      const startX = e.clientX
      const startW = th.offsetWidth
      handle.classList.add("active")
      function onMove(ev: MouseEvent) {
        col!.style.width = Math.max(34, startW + ev.clientX - startX) + "px"
      }
      function onUp() {
        handle!.classList.remove("active")
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colCount])
}
