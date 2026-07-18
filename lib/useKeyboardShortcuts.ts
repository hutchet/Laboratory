"use client"

import { useEffect } from "react"

export type ShortcutCombo = {
  key: string
  mod?: boolean // Ctrl on Windows/Linux, Cmd on Mac
  shift?: boolean
  handler: () => void
  ignoreInInputs?: boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
}

/**
 * Ha tang phim tat toan cuc dung chung. Ban goc chi co Escape (xem useEscapeClose.ts).
 * Hook nay dang ky them cac to hop phim moi (vi du Cmd/Ctrl+K mo Command Palette),
 * tu dong go dang ky khi component unmount.
 */
export function useKeyboardShortcuts(combos: ShortcutCombo[]) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      for (const combo of combos) {
        const modOk = combo.mod ? (e.metaKey || e.ctrlKey) : true
        const shiftOk = combo.shift ? e.shiftKey : !e.shiftKey || !combo.shift
        if (e.key.toLowerCase() !== combo.key.toLowerCase()) continue
        if (combo.mod && !modOk) continue
        if (combo.shift && !e.shiftKey) continue
        if (combo.ignoreInInputs !== false && isTypingTarget(e.target) && combo.mod) {
          // Allow mod-combos even while typing (e.g. Cmd+K), but skip plain-key combos while typing.
        }
        if (!combo.mod && isTypingTarget(e.target)) continue
        e.preventDefault()
        combo.handler()
        return
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combos])
}
