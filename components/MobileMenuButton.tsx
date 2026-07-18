"use client"

export default function MobileMenuButton() {
  return (
    <button
      type="button"
      className="mob-menu-btn"
      aria-label="Mở sidebar"
      onClick={() => (window as any).__tfToggleSidebar?.()}
      style={{
        display: "none",
        alignItems: "center",
        justifyContent: "center",
        width: 38, height: 38,
        border: "none",
        borderRadius: 10,
        background: "transparent",
        cursor: "pointer",
        color: "var(--ink)",
        flexShrink: 0,
      }}
    >
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    </button>
  )
}
