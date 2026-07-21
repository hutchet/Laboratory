"use client"
import type { CSSProperties } from "react"
import { useEffect, useRef, useState } from "react"
import { DirectionIcon } from "./icons"

export type SelectOption = { value: string; label: string }

// Custom styled dropdown thay the <select> gốc của trình duyệt.
// Thiết kế: nút pill có caret, menu nổi với item highlight màu xanh khi active.
export function CustomSelect({
  value,
  options,
  onChange,
  width,
  triggerStyle,
  disabled,
}: {
  value: string
  options: SelectOption[]
  onChange: (v: string) => void
  width?: number | string
  // Cho phep tuy chinh style rieng cua nut trigger (vd: bo border cho 1 vi tri cu the)
  // ma khong lam thay doi mac dinh cua CustomSelect o cac trang khac.
  triggerStyle?: CSSProperties
  disabled?: boolean
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
      {/* Lop nen chung cua droplist (surface-control) — truoc day nut trigger dung
          mau nen "--bg" (mau canvas trang, gan nhu vo hinh tren nen sang) nen nhin
          nhu "khong co nen". Doi sang dung dung bien --surface-control giong
          .sys-select-trigger cua ban goc (globals.css dong ~1615). */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((o) => !o) }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          width: "100%",
          height: 40,
          padding: "0 6px 0 14px",
          border: "none",
          borderRadius: 10,
          background: "var(--surface-control, #e7edf3)",
          color: "var(--sys-text, var(--ink, #1c2337))",
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          whiteSpace: "nowrap",
          ...triggerStyle,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{active?.label ?? "—"}</span>
        {/* Lop nen rieng cua icon mui ten (sys-icon-bg) — lop thu 2, tach biet mau
            voi nen chung cua ca trigger, dung dung cap doi mau .sys-select-arrow
            cua ban goc (globals.css dong ~1612/1622). */}
        {/* Ban goc CHI dung 1 icon co dinh (chevron-down) roi xoay CA khoi nen
            (background+icon) 180deg bang CSS transition khi mo — dung .sys-select-arrow
            trong globals.css dong ~1622 (nen) + v108 dong ~1860 (.sys-custom-select
            .sys-select-arrow{transition:transform .18s ease} va .open .sys-select-arrow
            {transform:rotate(180deg)}). Truoc day o day HOAN DOI 2 icon tinh khac nhau
            (chevronUp/chevronDown) nen chuyen tuc thi, khong co hieu ung xoay tu duoi
            len tren theo chieu kim dong ho nhu ban goc — nay sua dung theo co che goc. */}
        <span
          style={{
            width: 26,
            height: 26,
            minWidth: 26,
            display: "grid",
            placeItems: "center",
            borderRadius: 8,
            background: "var(--sys-icon-bg, #dce5ef)",
            color: "var(--sys-icon, #4d596a)",
            flex: "none",
            transition: "transform .18s ease",
            transform: open ? "rotate(180deg)" : "none",
          }}
        >
          <DirectionIcon name="chevronDown" size={16} />
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "100%",
            background: "var(--surface-large, #fff)",
            border: "none",
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
                  color: isActive ? "#fff" : "var(--sys-text, var(--ink, #1c2337))",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "var(--surface-control, #f4f5f8)"
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
