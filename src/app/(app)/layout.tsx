// App shell cho cac trang da dang nhap. Gia tri visual (.app/.side/.brand/.nav-h/.nav/.top) giu nguyen class name
// tu globals.css de ke thua CSS parity voi ban goc. TopSearch (?q= sang trang Cong viec) va
// NotificationBell (task qua han, dismiss luu localStorage tf_notif_hidden) da duoc port sang.
// CommandPalette/GlobalDetailModal/ToolbarEnforcer cua v14 van CHUA duoc port - xem control/DECISION.md.
import type { ReactNode } from "react"
import { auth } from "@/shared/lib/auth"
import { NavLink } from "@/shared/ui/nav-link"
import { NAV_GROUPS } from "@/shared/config/nav"
import { VINFAST_LOGO } from "@/shared/lib/vinfast-logo"
import { getUserRbacContext } from "@/shared/lib/rbac"
import { RBACProvider } from "@/shared/lib/rbac-client"
import { getSimRole } from "@/features/settings/role-sim"
import { logoutAction } from "./logout-action"
import { TopSearch } from "@/shared/ui/top-search"
import { NotificationBell } from "@/shared/ui/notification-bell"
import { listOverdueTasksForNotif } from "@/features/tasks/queries"
import { MobileSidebarController } from "@/shared/ui/mobile-sidebar-controller"
import { AvatarInitials } from "@/shared/ui/avatar-initials"

// Icon sidebar port 1:1 tu ban goc (taskflow_original.html dong 3095-3123, moi
// <button class="nav" data-page="..."> co 1 svg truoc label). NAV_GROUPS o
// shared/config/nav.ts la file .ts thuan (khong JSX) nen icon duoc map o day
// theo dataPage, dung chung ICON_ATTR cho toan bo (fill=none/stroke=currentColor).
const ICON_ATTR = { viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

const NAV_ICONS: Record<string, ReactNode> = {
  dash: (
    <svg {...ICON_ATTR}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  projects: (
    <svg {...ICON_ATTR}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
  ),
  centers: (
    <svg {...ICON_ATTR}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
  ),
  customers: (
    <svg {...ICON_ATTR}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="M22 21v-1a4 4 0 0 0-3-3.87" /></svg>
  ),
  samples: (
    <svg {...ICON_ATTR}><path d="M9 2v6l-5.5 9.5A2 2 0 0 0 5.24 21h13.52a2 2 0 0 0 1.74-3.5L15 8V2" /><path d="M9 2h6" /><path d="M8.5 13h7" /></svg>
  ),
  plan: (
    <svg {...ICON_ATTR}><rect x="3" y="4" width="10" height="3" rx="1" /><rect x="3" y="10.5" width="16" height="3" rx="1" /><rect x="3" y="17" width="7" height="3" rx="1" /></svg>
  ),
  equipment: (
    <svg {...ICON_ATTR}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
  ),
  analytics: (
    <svg {...ICON_ATTR}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
  ),
  "quote-depreciation": (
    <svg {...ICON_ATTR}><path d="M20 7h-9" /><path d="M14 17H5" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>
  ),
  "quote-overview": (
    <svg {...ICON_ATTR}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  ),
  "quote-catalog": (
    <svg {...ICON_ATTR}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
  ),
  "quote-matrix": (
    <svg {...ICON_ATTR}><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
  ),
  "quote-personnel": (
    <svg {...ICON_ATTR}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  "quote-variable": (
    <svg {...ICON_ATTR}><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-6" /></svg>
  ),
  report: (
    <svg {...ICON_ATTR}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
  ),
  tasks: (
    <svg {...ICON_ATTR}><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
  ),
  members: (
    <svg {...ICON_ATTR}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  purchase: (
    <svg {...ICON_ATTR}><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" /></svg>
  ),
  auditplan: (
    <svg {...ICON_ATTR}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  ),
  quality: (
    <svg {...ICON_ATTR}><path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" /><polyline points="9 12 11 14 15 10" /></svg>
  ),
  settings: (
    <svg {...ICON_ATTR}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
  ),
}

const LOGOUT_ICON = (
  <svg {...ICON_ATTR}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
)

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  const name = session?.user?.name || "Người dùng"
  const email = session?.user?.email || ""

  // Cung cấp context RBAC thật cho toàn app (Perm/useRBAC ở client) — vai trò lấy từ
  // Role/Permission thật của tài khoản đăng nhập. Nếu người dùng đang "giả lập vai trò"
  // trong trang Cài đặt (tf_active_role_v1, xem features/settings/role-sim.ts), CHỈ ghi
  // đè trường rank hiển thị UI — modulePerms dùng cho canModule()/Server Action vẫn giữ
  // đúng quyền thật, không bị giả lập chi phối.
  let rbacValue = { rank: "viewer" as const, roleNames: [] as string[], modulePerms: [] as string[] }
  if (session?.user?.id) {
    const ctx = await getUserRbacContext(session.user.id)
    const simRole = await getSimRole()
    rbacValue = { ...ctx, rank: simRole || ctx.rank }
  }
  const overdueTasks = await listOverdueTasksForNotif()

  return (
    <RBACProvider value={rbacValue}>
      {/* Port "v106 - mobile sidebar off-canvas drawer": vuot tu canh trai de mo sidebar tren
          mobile, bam ra ngoai/vuot trai de dong. CSS .side.v106-open/.v106-side-backdrop da co
          san trong globals.css, component nay chi noi hanh vi JS 1:1 tu ban goc (dong ~8215). */}
      <MobileSidebarController />
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
              {group.items.map((item) => (
                <NavLink key={item.moduleId + item.href} href={item.href} label={item.label} dataPage={item.dataPage} icon={NAV_ICONS[item.dataPage]} />
              ))}
            </div>
          ))}
          <form action={logoutAction}>
            <button type="submit" className="nav">
              {LOGOUT_ICON} Đăng xuất
            </button>
          </form>
        </aside>
        <main className="main">
          <div className="top" style={{ background: "var(--surface, #fff)", borderBottom: "1px solid var(--line, #e6e8ef)", padding: "0 20px", minHeight: 56, display: "flex", alignItems: "center" }}>
            <div className="top-r" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <TopSearch />
              <NotificationBell tasks={overdueTasks} />
              <div className="me" style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 4px 4px", borderRadius: 10, background: "var(--bg, #f4f5f7)" }}>
                <AvatarInitials name={name} size={34} />
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                  {email ? <div style={{ fontSize: 11, opacity: 0.6 }}>{email}</div> : null}
                </div>
              </div>
            </div>
          </div>
          <div className="main-body" style={{ padding: 20 }}>
            {children}
          </div>
        </main>
      </div>
    </RBACProvider>
  )
}
