// App shell cho cac trang da dang nhap. Gia tri visual (.app/.side/.brand/.nav-h/.nav/.top) giu nguyen class name
// tu globals.css de ke thua CSS parity voi ban goc. TopSearch (?q= sang trang Cong viec) va
// NotificationBell (task qua han, dismiss luu localStorage tf_notif_hidden) da duoc port sang.
// CommandPalette/GlobalDetailModal/ToolbarEnforcer cua v14 van CHUA duoc port - xem control/DECISION.md.
import type { ReactNode } from "react"
import { auth } from "@/shared/lib/auth"
import { NavLink } from "@/shared/ui/nav-link"
import { NAV_GROUPS } from "@/shared/config/nav"
import { VINFAST_LOGO } from "@/shared/lib/vinfast-logo"
import { getUserRbacContext, type RankName } from "@/shared/lib/rbac"
import { RBACProvider } from "@/shared/lib/rbac-client"
import { getSimRole } from "@/features/settings/role-sim"
import { logoutAction } from "./logout-action"
import { TopSearch } from "@/shared/ui/top-search"
import { NotificationBell } from "@/shared/ui/notification-bell"
import { listOverdueTasksForNotif } from "@/features/tasks/queries"
import { TopbarPageTitle } from "@/shared/ui/topbar-page-title"
import { MobileSidebarController } from "@/shared/ui/mobile-sidebar-controller"
import { AvatarInitials } from "@/shared/ui/avatar-initials"
import { NavIcon, type NavIconName } from "@/shared/ui/icons"

// Icon sidebar port 1:1 tu ban goc (taskflow_original.html dong 3095-3123, moi
// <button class="nav" data-page="..."> co 1 svg truoc label). Ban goc KHONG dung
// icon font (Material Symbols) - chi dung SVG net mong (fill=none/stroke=currentColor,
// stroke-width 1.8). Xem shared/ui/icons.tsx cho toan bo path da port.

const NAV_ICONS: Record<string, ReactNode> = Object.fromEntries(
  ([
    "dash", "projects", "centers", "customers", "samples", "plan", "equipment", "analytics",
    "quote-depreciation", "quote-overview", "quote-catalog", "quote-matrix", "quote-personnel", "quote-variable",
    "report", "tasks", "members", "purchase", "auditplan", "quality", "settings",
  ] as NavIconName[]).map((name) => [name, <NavIcon key={name} name={name} />]),
)

const LOGOUT_ICON = <NavIcon name="logout" />



export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  const name = session?.user?.name || "Người dùng"
  const email = session?.user?.email || ""

  // Cung cấp context RBAC thật cho toàn app (Perm/useRBAC ở client) — vai trò lấy từ
  // Role/Permission thật của tài khoản đăng nhập. Nếu người dùng đang "giả lập vai trò"
  // trong trang Cài đặt (tf_active_role_v1, xem features/settings/role-sim.ts), CHỈ ghi
  // đè trường rank hiển thị UI — modulePerms dùng cho canModule()/Server Action vẫn giữ
  // đúng quyền thật, không bị giả lập chi phối.
  let rbacValue: { rank: RankName; roleNames: string[]; modulePerms: string[] } = { rank: "viewer", roleNames: [], modulePerms: [] }
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
          <div className="top" style={{ padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div className="hello">
              <h2><TopbarPageTitle /></h2>
            </div>
            <div className="top-r" style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
