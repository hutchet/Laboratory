"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useKeyboardShortcuts } from "@/lib/useKeyboardShortcuts"
import { useEscapeClose } from "@/lib/useEscapeClose"

type PaletteItem = { href: string; label: string; group: string }

// Danh sach 19 route lay tu NAV_GROUPS (app/(app)/layout.tsx) de go-de-tim chuyen trang nhanh.
const ITEMS: PaletteItem[] = [
  { href: "/dash", label: "Tổng quan", group: "Tổng quan" },
  { href: "/projects", label: "Dự án", group: "Vận hành thử nghiệm" },
  { href: "/centers", label: "Trung tâm thử nghiệm", group: "Vận hành thử nghiệm" },
  { href: "/customers", label: "Khách hàng", group: "Vận hành thử nghiệm" },
  { href: "/samples", label: "Quản lý Mẫu", group: "Vận hành thử nghiệm" },
  { href: "/plan", label: "Kế hoạch (Plan)", group: "Vận hành thử nghiệm" },
  { href: "/equipment?tab=equipment", label: "Thiết bị", group: "Thiết bị" },
  { href: "/equipment?tab=analytics", label: "Đặt lịch thiết bị", group: "Thiết bị" },
  { href: "/quote?tab=quote-depreciation", label: "Khấu hao thiết bị", group: "Thiết bị" },
  { href: "/quote?tab=quote-overview", label: "Tổng quan báo giá", group: "Báo giá dự án" },
  { href: "/quote?tab=quote-catalog", label: "Danh mục bài thử nghiệm", group: "Báo giá dự án" },
  { href: "/quote?tab=quote-matrix", label: "Đơn giá thiết bị", group: "Báo giá dự án" },
  { href: "/quote?tab=quote-personnel", label: "Đơn giá nhân sự", group: "Báo giá dự án" },
  { href: "/quote?tab=quote-variable", label: "Chi phí biến đổi khác", group: "Báo giá dự án" },
  { href: "/report", label: "Báo cáo", group: "Báo cáo" },
  { href: "/tasks", label: "Công việc", group: "Nội bộ" },
  { href: "/members", label: "Thành viên", group: "Nội bộ" },
  { href: "/purchase", label: "Theo dõi mua hàng", group: "Mua sắm" },
  { href: "/auditplan", label: "Kế hoạch Audit", group: "Hệ thống" },
  { href: "/quality", label: "Hệ thống quản lý chất lượng", group: "Hệ thống" },
  { href: "/settings", label: "Cài đặt", group: "Hệ thống" },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useKeyboardShortcuts([
    {
      key: "k",
      mod: true,
      handler: () => {
        setOpen((prev) => !prev)
        setQuery("")
        setActiveIdx(0)
        setTimeout(() => inputRef.current?.focus(), 0)
      },
    },
  ])
  useEscapeClose(open, () => setOpen(false))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ITEMS
    return ITEMS.filter((it) => it.label.toLowerCase().includes(q) || it.group.toLowerCase().includes(q))
  }, [query])

  function go(item: PaletteItem) {
    setOpen(false)
    router.push(item.href)
  }

  function onKeyDownList(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = filtered[activeIdx]
      if (item) go(item)
    }
  }

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      id="cmdk-layer"
      onMouseDown={(ev) => { if (ev.target === ev.currentTarget) setOpen(false) }}
      style={{ alignItems: "flex-start", paddingTop: "12vh" }}
    >
      <div className="modal" id="cmdk-card" style={{ maxWidth: 480, width: "100%" }}>
        <div className="modal-body">
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0) }}
            onKeyDown={onKeyDownList}
            placeholder="Gõ để tìm trang... (Esc để đóng)"
            style={{ width: "100%", marginBottom: 8 }}
          />
          <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
            {filtered.length === 0 && <div style={{ padding: 8, opacity: 0.6 }}>Không tìm thấy trang phù hợp</div>}
            {filtered.map((item, idx) => (
              <div
                key={item.href}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => go(item)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: idx === activeIdx ? "var(--hover, rgba(0,0,0,0.06))" : "transparent",
                }}
              >
                <div style={{ fontSize: 13, opacity: 0.55 }}>{item.group}</div>
                <div>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
