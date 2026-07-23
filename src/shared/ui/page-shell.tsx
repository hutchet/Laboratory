import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

export type PageShellProps = {
  title: string
  subtitle?: string
  actions?: ReactNode
  filters?: ReactNode
  children: ReactNode
  className?: string
}

/** Standard page chrome. Every feature view wraps content with this instead of re-implementing headers. */
export function PageShell({ title, subtitle, actions, filters, children, className }: PageShellProps) {
  // Fix bao cao 1:40 PM muc 9: truoc day actions va filters nam o 2 hang rieng (filters
  // luon xuong hang duoi actions) nen o trang Bao gia - Tong quan, o tim kiem va nut
  // "+ Them bao gia" bi le hang. Gom lai thanh 1 hang duy nhat: filters ben trai, actions
  // ben phai (giu nguyen "chi co actions" -> can phai nhu cu; "chi co filters" -> ve ben
  // trai 1 hang, khong con thut them margin rieng).
  return (
    <div className={cn("tf-page", className)} data-tf-kit="page-shell">
      {actions || filters ? (
        <div className="tf-page-head" style={{ display: "flex", justifyContent: filters ? "space-between" : "flex-end", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {filters ? <div className="tf-page-filters" style={{ flex: "1 1 auto", minWidth: 200 }}>{filters}</div> : null}
          {actions ? <div className="tf-page-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
        </div>
      ) : null}
      <div className="tf-page-body">{children}</div>
    </div>
  )
}

export default PageShell
