"use client"
import { useEffect, useRef, useState } from "react"

// Shared chip-style filter dropdown. Ported from the original app's
// `renderFilterDropdown()` (a single pill button that opens a menu of
// options) so every page that used `.chips`/`.filterdrop` in the original
// HTML (Tasks `#chips`, Samples `#sm-status-chips`, Equipment `#eq-cat-chips`)
// can share one implementation instead of re-inventing filter UI per page.
// Reuses the existing `.filterdrop`/`.filterdrop-btn`/`.filterdrop-menu`/
// `.filterdrop-item`/`.dot` classes already defined in globals.css.

export type ChipFilterOption = { value: string; label: string; dot?: string }

export function ChipFilterDropdown({
  value,
  options,
  onChange,
  className,
}: {
  value: string
  options: ChipFilterOption[]
  onChange: (v: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [])

  return (
    <div ref={ref} className={`filterdrop${open ? " open" : ""}${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="filterdrop-btn"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        <span className="fd-label">
          {active?.dot ? <span className="dot" style={{ background: active.dot }} /> : null}
          {active ? active.label : "Lọc"}
        </span>
        <svg className="fd-caret" viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? (
        <div className="filterdrop-menu">
          {options.map((o) => (
            <div
              key={o.value}
              className={`filterdrop-item${o.value === value ? " active" : ""}`}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onChange(o.value)
              }}
            >
              {o.dot ? <span className="dot" style={{ background: o.dot }} /> : null}
              {o.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default ChipFilterDropdown
