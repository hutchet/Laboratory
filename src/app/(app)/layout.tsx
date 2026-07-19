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

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  const name = session?.user?.name || session?.user?.email || "Người dùng"

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
                <NavLink key={item.moduleId + item.href} href={item.href} label={item.label} dataPage={item.dataPage} />
              ))}
            </div>
          ))}
          <form action={logoutAction}>
            <button type="submit" className="nav">
              Đăng xuất
            </button>
          </form>
        </aside>
        <main className="main">
          <div className="top">
            <div className="top-r" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <TopSearch />
              <NotificationBell tasks={overdueTasks} />
              <span style={{ fontSize: 13, opacity: 0.75 }}>{name}</span>
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
