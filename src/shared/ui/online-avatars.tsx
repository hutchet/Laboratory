"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { AvatarInitials } from "@/shared/ui/avatar-initials"
import type { OnlineMember } from "@/app/api/online-members/route"

// Hiển thị avatar các thành viên đang hoạt động (có session gần đây) ở right side
// của header, giống Office 365 presence bar. Poll mỗi 60s, timeout fetch sau 5s.
export function OnlineAvatars() {
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
        if (mounted.current) setMembers(data)
      }
    } catch { /* silent — keep stale data */ }
  }, [])

  useEffect(() => {
    mounted.current = true
    fetchMembers()
    const interval = setInterval(fetchMembers, 60000)
    return () => { mounted.current = false; clearInterval(interval) }
  }, [fetchMembers])

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
            ? <img key={m.id} src={m.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", marginLeft: -6, border: "2px solid var(--bg, #fff)", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }} />
            : <span key={m.id} style={{ marginLeft: -6, border: "2px solid var(--bg, #fff)", borderRadius: "50%", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}><AvatarInitials name={m.name} size={28} /></span>
        ))}
        {members.length > 4 && (
          <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--md-sys-color-surface-container-high, #eef0f4)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600, color: "var(--muted, #6b7280)", marginLeft: -6, border: "2px solid var(--bg, #fff)" }}>
            +{members.length - 4}
          </span>
        )}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "8px 0", minWidth: 200, zIndex: 999 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", padding: "4px 14px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Đang hoạt động</div>
          {members.map((m) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", fontSize: 13 }}>
              {m.avatar
                ? <img src={m.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                : <AvatarInitials name={m.name} size={28} />
              }
              <span style={{ fontWeight: 500 }}>{m.name}</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", marginLeft: "auto" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
