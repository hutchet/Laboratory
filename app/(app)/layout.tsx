// Layout dung chung cho cac trang da dang nhap, phuc dung CHINH XAC theo cau truc
// sidebar/topbar cua file index.html goc: .app / .side / .brand / .nav-h / .nav / .top / .me
import type { ReactNode } from "react"
import { auth } from "@/lib/auth"
import NavLink from "@/components/NavLink"
import { logoutAction } from "./logout-action"
import { VINFAST_LOGO } from "@/lib/vinfast-logo"

export const runtime = 'edge'

type NavItem = { href: string; label: string; dataPage: string; icon: ReactNode }
type NavGroup = { heading: string; items: NavItem[] }

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: path }} />
  )
}

// Cac group va icon duoc lay dung tu <aside class="side"> ban goc (dong 3092-3124)
const NAV_GROUPS: NavGroup[] = [
  {
    heading: "Tổng quan",
    items: [
      { href: "/dash", label: "Tổng quan", dataPage: "dash", icon: <Icon path='<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>' /> },
    ],
  },
  {
    heading: "Vận hành thử nghiệm",
    items: [
      { href: "/projects", label: "Dự án", dataPage: "projects", icon: <Icon path='<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>' /> },
      { href: "/centers", label: "Trung tâm thử nghiệm", dataPage: "centers", icon: <Icon path='<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>' /> },
      { href: "/customers", label: "Khách hàng", dataPage: "customers", icon: <Icon path='<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M22 21v-1a4 4 0 0 0-3-3.87"/>' /> },
      { href: "/samples", label: "Quản lý Mẫu", dataPage: "samples", icon: <Icon path='<path d="M9 2v6l-5.5 9.5A2 2 0 0 0 5.24 21h13.52a2 2 0 0 0 1.74-3.5L15 8V2"/><path d="M9 2h6"/><path d="M8.5 13h7"/>' /> },
      { href: "/plan", label: "Kế hoạch", dataPage: "plan", icon: <Icon path='<rect x="3" y="4" width="10" height="3" rx="1"/><rect x="3" y="10.5" width="16" height="3" rx="1"/><rect x="3" y="17" width="7" height="3" rx="1"/>' /> },
    ],
  },
  {
    heading: "Thiết bị",
    items: [
      { href: "/equipment?tab=equipment", label: "Thiết bị", dataPage: "equipment", icon: <Icon path='<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>' /> },
      { href: "/equipment?tab=analytics", label: "Đặt lịch", dataPage: "analytics", icon: <Icon path='<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' /> },
      { href: "/quote?tab=quote-depreciation", label: "Khấu hao thiết bị", dataPage: "quote-depreciation", icon: <Icon path='<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>' /> },
    ],
  },
  {
    heading: "BÁO GIÁ DỰ ÁN",
    items: [
      { href: "/quote?tab=quote-overview", label: "Tổng quan báo giá", dataPage: "quote-overview", icon: <Icon path='<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' /> },
      { href: "/quote?tab=quote-catalog", label: "Danh mục bài thử nghiệm", dataPage: "quote-catalog", icon: <Icon path='<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>' /> },
      { href: "/quote?tab=quote-matrix", label: "Đơn giá thiết bị", dataPage: "quote-matrix", icon: <Icon path='<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' /> },
      { href: "/quote?tab=quote-personnel", label: "Đơn giá nhân sự", dataPage: "quote-personnel", icon: <Icon path='<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' /> },
      { href: "/quote?tab=quote-variable", label: "Chi phí biến đổi khác", dataPage: "quote-variable", icon: <Icon path='<path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-6"/>' /> },
    ],
  },
  {
    heading: "Báo cáo",
    items: [
      { href: "/report", label: "Báo cáo", dataPage: "report", icon: <Icon path='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' /> },
    ],
  },
  {
    heading: "Nội bộ",
    items: [
      { href: "/tasks", label: "Công việc", dataPage: "tasks", icon: <Icon path='<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' /> },
      { href: "/members", label: "Thành viên", dataPage: "members", icon: <Icon path='<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' /> },
    ],
  },
  {
    heading: "Mua sắm",
    items: [
      { href: "/purchase", label: "Theo dõi mua hàng", dataPage: "purchase", icon: <Icon path='<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/>' /> },
    ],
  },
  {
    heading: "Hệ thống",
    items: [
      { href: "/auditplan", label: "Kế hoạch", dataPage: "auditplan", icon: <Icon path='<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' /> },
      { href: "/quality", label: "Hệ thống quản lý chất lượng", dataPage: "quality", icon: <Icon path='<path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z"/><polyline points="9 12 11 14 15 10"/>' /> },
      { href: "/settings", label: "Cài đặt", dataPage: "settings", icon: <Icon path='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' /> },
    ],
  },
]

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  const name = session?.user?.name || session?.user?.email || "Người dùng"
  const email = session?.user?.email || ""
  const initials = name.slice(0, 2).toUpperCase()

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="vinfast-v-logo" src={VINFAST_LOGO} alt="" />
          <span>VinFast</span>
        </div>
        {NAV_GROUPS.map((group) => (
          <div key={group.heading}>
            <div className="nav-h">{group.heading}</div>
            {group.items.map((item, idx) => (
              <NavLink key={item.dataPage + idx} href={item.href} label={item.label} dataPage={item.dataPage} icon={item.icon} />
            ))}
          </div>
        ))}
        <form action={logoutAction}>
          <button type="submit" className="nav">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {" "}
            {"Đăng xuất"}
          </button>
        </form>
      </aside>
      <main className="main">
        <div className="top">
          <div className="hello">
            <h2>{"Xin chào"}</h2>
            <p>{"Chúc một ngày làm việc hiệu quả"}</p>
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
