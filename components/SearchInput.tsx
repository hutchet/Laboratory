"use client"

import { useEffect, useRef } from "react"

export default function SearchInput() {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = () => ref.current?.focus()
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        window.dispatchEvent(new Event("tf-open-search"))
      }
    })
    return () => document.removeEventListener("keydown", handler)
  }, [])

  return (
    <input
      id="topsearch"
      ref={ref}
      placeholder="Tìm kiếm..."
      style={{ fontSize: 13 }}
      readOnly
      onFocus={(e) => {
        e.currentTarget.blur()
        window.dispatchEvent(new Event("tf-open-search"))
      }}
    />
  )
}
