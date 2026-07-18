"use client"
export default function SearchInput() {
  return (
    <input
      id="topsearch"
      placeholder="Tìm kiếm..."
      readOnly
      onFocus={(e) => {
        e.currentTarget.blur()
        window.dispatchEvent(new Event("tf-open-search"))
      }}
    />
  )
}
