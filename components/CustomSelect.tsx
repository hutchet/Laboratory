"use client"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useEscapeClose } from "@/lib/useEscapeClose"

// CustomSelect voi portal-positioning (tuong duong v103PortalMenu cua ban goc:
// js/23-ui-patches-and-i18n.js). Menu dropdown duoc render tai document.body voi
// position:fixed, tranh bi cat boi overflow:hidden/auto cua cac container cha.
export type CustomSelectOption = { value: string; label: string; disabled?: boolean }

type ListPos = { top: number; left: number; width: number; above: boolean }

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
  const [listPos, setListPos] = useState<ListPos | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const current = value !== undefined ? value : internal

  useEffect(() => {
    if (value !== undefined) setInternal(value)
  }, [value])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) { setListPos(null); return }
    const rect = triggerRef.current.getBoundingClientRect()
    const vh = window.innerHeight
    const menuH = Math.min(options.length * 36 + 8, 260)
    const below = rect.bottom + menuH <= vh
    setListPos({
      top: below ? rect.bottom + 2 : rect.top - menuH - 2,
      left: rect.left,
      width: rect.width,
      above: !below,
    })
  }, [open, options.length])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onScroll() { setOpen(false) }
    document.addEventListener("click", onDocClick)
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    return () => {
      document.removeEventListener("click", onDocClick)
      window.removeEventListener("scroll", onScroll, { capture: true })
    }
  }, [open])

  useEscapeClose(open, () => setOpen(false))

  const selected = options.find((o) => o.value === current)

  function selectValue(v: string, optDisabled?: boolean) {
    if (optDisabled) return
    setInternal(v)
    setOpen(false)
    onChange?.(v)
  }

  const menu = open && listPos ? createPortal(
    <div
      className="sys-select-list"
      style={{
        position: "fixed",
        top: listPos.top,
        left: listPos.left,
        width: listPos.width,
        zIndex: 9999,
        maxHeight: 260,
        overflowY: "auto",
        boxSizing: "border-box",
      }}
    >
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
    </div>,
    document.body
  ) : null

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
        ref={triggerRef}
        className="sys-select-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sys-cs-label">{selected ? selected.label : (placeholder ?? "")}</span>
        <span className="sys-select-arrow sys-cs-caret">▾</span>
      </button>
      {menu}
    </div>
  )
}
