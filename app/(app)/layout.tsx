// Layout dung chung cho cac trang da dang nhap -- TODO: dung lai sidebar/topbar tu index.html (css/styles.css) goc
import type { ReactNode } from "react"
import Link from "next/link"

const NAV_ITEMS = [
  { href: "/dash", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/projects", label: "Projects" },
  { href: "/equipment", label: "Equipment" },
  { href: "/quote", label: "Quote" },
  { href: "/purchase", label: "Purchase" },
  { href: "/auditplan", label: "Audit Plan" },
  { href: "/members", label: "Members" },
  { href: "/customers", label: "Customers" },
  { href: "/report", label: "Report" },
  { href: "/settings", label: "Settings" },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav style={{ width: 200, borderRight: "1px solid #ddd", padding: 16, flexShrink: 0 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>TaskFlow</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <Link href={item.href} style={{ textDecoration: "none", color: "#333" }}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <form action="/api/auth/signout" method="post" style={{ marginTop: 24 }}>
          <button type="submit" style={{ padding: "6px 12px" }}>Dang xuat</button>
        </form>
      </nav>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  )
}
