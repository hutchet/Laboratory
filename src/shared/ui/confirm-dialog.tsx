"use client"
import { useEffect } from "react"

export type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Xác nhận", cancelLabel = "Hủy", danger, onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      data-tf-kit="confirm-dialog"
      style={{ position: "fixed", inset: 0, background: "rgba(15,18,22,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 12, padding: 20, width: 360, boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{title}</div>
        {description ? <div style={{ fontSize: 13, opacity: 0.75, marginBottom: 16 }}>{description}</div> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff" }}>
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", color: "#fff", background: danger ? "#c62828" : "#1d5fd6" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
