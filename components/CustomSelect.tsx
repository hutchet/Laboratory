"use client"
import { useEffect, useRef, useState } from "react"
import { useEscapeClose } from "@/lib/useEscapeClose"

// Tai hien he thong "sys-custom-select" cua ban goc: 1 <select> thuc (an, van
// nam trong <form> de submit dung name/value) + 1 trigger + danh sach tuy
// chinh hien thi de nguoi dung bam chon, dung lai class CSS da co san trong
// globals.css (.sys-custom-select/.sys-select-trigger/.sys-select-arrow/.sys-select-list/.sys-select-option).
export type CustomSelectOption = { value: string; label: string; disabled?: boolean }

export function CustomSelect({
  id,
  name,
  value,
  defaultValue,
  onChange,
  options,
  placeholder,
  className,
  disabled,
  required,
}: {
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [internal, setInternal] = useState(value ?? defaultValue ?? "")
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const current = value !== undefined ? value : internal

  useEffect(() => {
    if (value !== undefined) setInternal(value)
  }, [value])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [open])

  useEscapeClose(open, () => setOpen(false))

  const selected = options.find((o) => o.value === current)

  function selectValue(v: string, optDisabled?: boolean) {
    if (optDisabled) return
    setInternal(v)
    setOpen(false)
    onChange?.(v)
  }

  return (
    <div className={"sys-custom-select" + (open ? " open" : "") + (className ? " " + className : "")} ref={wrapRef}>
      <select
        id={id}
        name={name}
        value={current}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
        required={required}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        type="button"
        className="sys-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sys-cs-label">{selected ? selected.label : (placeholder ?? "")}</span>
        <span className="sys-select-arrow sys-cs-caret">▾</span>
      </button>
      {open && (
        <div className="sys-select-list">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              className={"sys-select-option" + (o.value === current ? " active" : "")}
              disabled={o.disabled}
              onClick={() => selectValue(o.value, o.disabled)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
