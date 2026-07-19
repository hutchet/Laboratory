"use client"
import { useEffect, useState } from "react"
import Link from "next/link"

export type NotifTask = {
  id: string
  title: string
  projectName: string | null
  assigneeName: string | null
  daysLate: number
}

const DISMISS_KEY = "tf_notif_hidden"

// Port cua notif-wrap/#bell/#notif-panel ban goc (dong 3130-3132, renderNotif() dong 5431):
// chuong thong bao hien task qua han, luu danh sach da "xoa het" (dismiss) vao localStorage
// giong tf_notif_hidden ban goc, khong dung server state vi day chi la UI-level dismiss.
export function NotificationBell({ tasks }: { tasks: NotifTask[] }) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY)
      if (raw) setDismissed(JSON.parse(raw))
    } catch {
      // ignore malformed storage
    }
  }, [])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (!target.closest(".notif-wrap")) setOpen(false)
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [open])

  const visible = mounted ? tasks.filter((t) => !dismissed.includes(t.id)) : tasks

  function clearAll() {
    const ids = tasks.map((t) => t.id)
    const next = Array.from(new Set([...dismissed, ...ids]))
    setDismissed(next)
    try {
      window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
    } catch {
      // ignore storage write failure
    }
  }

  return (
    <div className="notif-wrap">
      <div className="iconbtn" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }} role="button" aria-label="Thông báo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="rd" style={{ display: visible.length ? "block" : "none" }} />
      </div>
      <div className="notif-panel" style={{ display: open ? "block" : "none" }}>
        <div className="np-head">
          <span>Công việc quá hạn</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" className="np-clear" onClick={clearAll}>
              Xóa hết
            </button>
            <span className="cnt">{visible.length}</span>
          </div>
        </div>
        <div>
          {visible.length === 0 ? (
            <div className="np-empty">🎉 Không có công việc quá hạn</div>
          ) : (
            visible.map((t) => (
              <Link key={t.id} href="/tasks" className="np-item" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="np-dot" />
                <div className="np-body">
                  <div className="np-name">{t.title}</div>
                  <div className="np-meta">
                    {t.projectName ?? "—"} · {t.assigneeName ?? "—"} · trễ {t.daysLate} ngày
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationBell
