"use client"
import type { CSSProperties } from "react"
import { useEffect, useRef, useState } from "react"

export type SelectOption = { value: string; label: string }

// Custom styled dropdown thay the <select> gốc của trình duyệt.
// Thiết kế: nút pill có caret, menu nổi với item highlight màu xanh khi active.
export function CustomSelect({
  value,
  options,
  onChange,
  width,
  triggerStyle,
}: {
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
  width?: number | string
  // Cho phep tuy chinh style rieng cua nut trigger (vd: bo border cho 1 vi tri cu the)
  // ma khong lam thay doi mac dinh cua CustomSelect o cac trang khac.
  triggerStyle?: CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = options.find((o) => o.value === value) ?? options[0]

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "relative",
        display: "inline-block",
        width: width ?? "auto",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
          height: 36,
          padding: "0 12px",
          border: "1.5px solid var(--line, #dde1e9)",
          borderRadius: 9,
          background: "var(--bg, #f4f5f8)",
          color: "var(--ink, #1c2337)",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
          ...triggerStyle,
        }}
      >
        <span>{active?.label ?? "—"}</span>
        <svg
          viewBox="0 0 24 24"
          width={14}
          height={14}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "100%",
            background: "#fff",
            border: "1px solid var(--line, #dde1e9)",
            borderRadius: 12,
            boxShadow: "0 10px 28px rgba(20,25,50,.14)",
            padding: 6,
            zIndex: 50,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {options.map((o) => {
            const isActive = o.value === value
            return (
              <div
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false) }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  background: isActive ? "var(--pri, #2563eb)" : "transparent",
                  color: isActive ? "#fff" : "var(--ink, #1c2337)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "var(--bg, #f4f5f8)"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"
                }}
              >
                {o.label}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CustomSelect
