"use client"
import type { ReactNode } from "react"
import { useEffect } from "react"

export type FormModalProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  onSubmit?: () => void
  submitLabel?: string
  cancelLabel?: string
  submitting?: boolean
  width?: number
}

/** Standard create/edit modal shell. Feature forms render fields as children; this owns overlay + footer. */
export function FormModal({ open, title, children, onClose, onSubmit, submitLabel = "Lưu", cancelLabel = "Hủy", submitting, width = 760 }: FormModalProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      data-tf-kit="form-modal"
      style={{ position: "fixed", inset: 0, background: "rgba(15,18,22,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit?.()
        }}
        style={{ background: "var(--card, var(--surface-large, #fff))", color: "var(--ink)", borderRadius: 12, padding: 20, width, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.35)", border: "1px solid var(--line)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
          <button type="button" className="modal-x" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="fm-wide-grid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-control, #fff)", color: "var(--ink)" }}>
            {cancelLabel}
          </button>
          <button type="submit" disabled={submitting} style={{ padding: "8px 14px", borderRadius: 8, border: "none", color: "#fff", background: "#1d5fd6", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Đang lưu..." : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

export default FormModal
