"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

// Port cua #topsearch ban goc (dong 3129, wiring dong 6486): go tim kiem se nhay sang trang
// Cong viec va loc theo tu khoa (ban goc dung bien global `search` de renderTasks() loc truc
// tiep; ban Next.js dung query param ?q= vi moi trang la 1 route rieng).
export function TopSearch() {
  const router = useRouter()
  const [value, setValue] = useState("")

  function onChange(v: string) {
    setValue(v)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && value.trim()) {
      router.push(`/tasks?q=${encodeURIComponent(value.trim())}`)
    }
  }

  return (
    <div className="search" style={{ minWidth: 0, maxWidth: 260 }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        placeholder="Tìm kiếm..."
        style={{ fontSize: 13 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  )
}

export default TopSearch
