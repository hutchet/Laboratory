"use client"

import { useEffect, useState } from "react"

// Tai hien khoi thong bao (#bell / #notif-panel) cua ban goc — bi thieu hoan
// toan trong layout hien tai. Logic dong bo voi js/19-notifications-modal-init.js:
// bam chuong mo/dong panel, nut "Xoa het" luu danh sach da an vao localStorage
// key tf_notif_hidden, click ra ngoai .notif-wrap thi tu dong dong panel.
export type NotifTask = {
  id: string
  title: string
  projectName: string | null
  assigneeName: string
  dueDateLabel: string
}

export default function NotificationBell({ tasks }: { tasks: NotifTask[] }) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem("tf_notif_hidden")
      if (raw) setDismissed(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest(".notif-wrap")) setOpen(false)
    }
    document.addEventListener("click", onDocClick)
    return () => document.removeEventListener("click", onDocClick)
  }, [open])

  const visible = tasks.filter((t) => !dismissed.includes(t.id))

  function clearAll() {
    const ids = tasks.map((t) => t.id)
    const next = Array.from(new Set([...dismissed, ...ids]))
    setDismissed(next)
    try {
      localStorage.setItem("tf_notif_hidden", JSON.stringify(next))
    } catch {}
  }

  return (
    <div className="notif-wrap">
      <div
        className="iconbtn"
        id="bell"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {visible.length > 0 && <span className="rd" id="bell-rd" />}
      </div>
      <div className={open ? "notif-panel" : "notif-panel hidden"} id="notif-panel">
        <div className="np-head">
          <span>Công việc quá hạn</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="np-clear"
              id="notif-clear"
              onClick={(e) => {
                e.stopPropagation()
                clearAll()
              }}
            >
              Xóa hết
            </button>
            <span className="cnt" id="notif-cnt">{visible.length}</span>
          </div>
        </div>
        <div id="notif-list">
          {visible.length === 0 && <div className="np-empty">Không có dữ liệu</div>}
          {visible.length > 0 && (
            <table>
              <thead>
                <tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th></tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id}>
                    <td><b>{t.title}</b></td>
                    <td>{t.projectName ?? "Nội bộ phát sinh"}</td>
                    <td>{t.assigneeName}</td>
                    <td>{t.dueDateLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
