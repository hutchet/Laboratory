// Layout dung chung cho cac trang da dang nhap, phuc dung theo cau truc sidebar/topbar
// cua file index.html goc (css/styles.css): .app / .side / .brand / .nav-h / .nav / .top / .me
import type { ReactNode } from "react"
import { auth } from "@/lib/auth"
import NavLink from "@/components/NavLink"
import { logoutAction } from "./logout-action"

type NavGroup = { heading: string; items: Array<{ href: string; label: string; dataPage: string }> }

const NAV_GROUPS: NavGroup[] = [
  { heading: "Tong quan", items: [{ href: "/dash", label: "Dashboard", dataPage: "dash" }] },
  {
    heading: "Cong viec",
    items: [
      { href: "/tasks", label: "Cong viec", dataPage: "tasks" },
      { href: "/projects", label: "Du an", dataPage: "projects" },
      { href: "/centers", label: "Trung tam", dataPage: "centers" },
      { href: "/customers", label: "Khach hang", dataPage: "customers" },
      { href: "/samples", label: "Mau", dataPage: "samples" },
      { href: "/plan", label: "Ke hoach thu nghiem", dataPage: "plan" },
    ],
  },
  {
    heading: "Thiet bi & Chat luong",
    items: [
      { href: "/equipment", label: "Thiet bi", dataPage: "equipment" },
      { href: "/quality", label: "Chat luong", dataPage: "quality" },
      { href: "/auditplan", label: "Ke hoach kiem toan", dataPage: "auditplan" },
    ],
  },
  {
    heading: "Bao gia & Mua sam",
    items: [
      { href: "/quote", label: "Bao gia", dataPage: "quote-overview" },
      { href: "/purchase", label: "Mua sam", dataPage: "purchase" },
    ],
  },
  {
    heading: "Nhan su & Bao cao",
    items: [
      { href: "/members", label: "Thanh vien", dataPage: "members" },
      { href: "/report", label: "Bao cao", dataPage: "report" },
    ],
  },
  { heading: "He thong", items: [{ href: "/settings", label: "Cai dat", dataPage: "settings" }] },
]

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  const name = session?.user?.name || session?.user?.email || "Nguoi dung"
  const email = session?.user?.email || ""
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="logo" />
          <span>TaskFlow</span>
        </div>
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            <div className="nav-h">{group.heading}</div>
            {group.items.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} dataPage={item.dataPage} />
            ))}
          </div>
        ))}
        <div className="upgrade">
          <form action={logoutAction}>
            <button type="submit">Dang xuat</button>
          </form>
        </div>
      </aside>
      <main className="main">
        <div className="top">
          <div className="hello">
            <h2>Xin chao</h2>
            <p>Chuc mot ngay lam viec hieu qua</p>
          </div>
          <div className="top-r">
            <div className="me">
              <div className="av">{initials}</div>
              <div>
                <div className="nm">{name}</div>
                <div className="em">{email}</div>
              </div>
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
