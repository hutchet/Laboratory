"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { AvatarInitials } from "@/shared/ui/avatar-initials"
import type { OnlineMember } from "@/app/api/online-members/route"

// Hiển thị avatar các thành viên đang đăng nhập (có session gần đây) ở right side
// của header, giống Office 365 presence bar.
// Fix bao cao 1:40 PM muc 6:
// - Khong hien avatar cua chinh nguoi dang xem (currentEmail) trong danh sach.
// - Gui "heartbeat" (POST /api/heartbeat) moi 30s trong khi tab dang mo de server biet
//   tai khoan nay dang thuc su hoat dong (xem shared/lib/presence-store.ts).
// - Thanh vien "active" (co heartbeat gan day) hien vong tron mau quanh icon; thanh
//   vien chi con session hop le nhung khong con heartbeat thi chi hien icon, khong vien.
const ACTIVE_RING = "0 0 0 2px var(--bg, #fff), 0 0 0 3.5px #22c55e"
const IDLE_RING = "0 0 0 2px var(--bg, #fff)"

export function OnlineAvatars({ currentEmail }: { currentEmail?: string }) {
  const [members, setMembers] = useState<OnlineMember[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)

  const fetchMembers = useCallback(async () => {
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 5000)
      const res = await fetch("/api/online-members", { signal: controller.signal })
      if (res.ok) {
        const data: OnlineMember[] = await res.json()
        if (mounted.current) setMembers(data.filter((m) => !currentEmail || m.email !== currentEmail))
      }
    } catch { /* silent — keep stale data */ }
  }, [currentEmail])

  const sendHeartbeat = useCallback(() => {
    fetch("/api/heartbeat", { method: "POST" }).catch(() => {})
  }, [])

  useEffect(() => {
    mounted.current = true
    fetchMembers()
    sendHeartbeat()
    const pollInterval = setInterval(fetchMembers, 60000)
    const beatInterval = setInterval(sendHeartbeat, 30000)
    return () => { mounted.current = false; clearInterval(pollInterval); clearInterval(beatInterval) }
  }, [fetchMembers, sendHeartbeat])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [])

  if (!members.length) return null

  return (
    <div ref={ref} style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", cursor: "pointer", padding: "2px 4px", borderRadius: 8, gap: 0 }}
      >
        {members.slice(0, 4).map((m) => (
          m.avatar
            ? <img key={m.id} src={m.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", marginLeft: -6, boxShadow: m.active ? ACTIVE_RING : IDLE_RING }} />
            : <span key={m.id} style={{ marginLeft: -6, borderRadius: "50%", boxShadow: m.active ? ACTIVE_RING : IDLE_RING, display: "inline-flex" }}><AvatarInitials name={m.name} size={28} /></span>
        ))}
        {members.length > 4 && (
          <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--md-sys-color-surface-container-high, #eef0f4)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, color: "var(--muted, #6b7280)", marginLeft: -6, boxShadow: IDLE_RING }}>
            +{members.length - 4}
          </span>
        )}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "8px 0", minWidth: 200, zIndex: 999 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", padding: "4px 14px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Đã đăng nhập</div>
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", fontSize: 13 }}>
              {m.avatar
                ? <img src={m.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", boxShadow: m.active ? ACTIVE_RING : "none" }} />
                : <span style={{ borderRadius: "50%", boxShadow: m.active ? ACTIVE_RING : "none", display: "inline-flex" }}><AvatarInitials name={m.name} size={28} /></span>
              }
              <span style={{ fontWeight: 500 }}>{m.name}</span>
              <span style={{ fontSize: 11, color: m.active ? "#22c55e" : "#9ca3af", marginLeft: "auto" }}>{m.active ? "Đang hoạt động" : "Không hoạt động"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
