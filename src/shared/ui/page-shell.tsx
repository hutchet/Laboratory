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
  return (
    <div className={cn("tf-page", className)} data-tf-kit="page-shell">
      <div className="tf-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
        <div>
          <h1 className="tf-page-title" style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{title}</h1>
          {subtitle ? <p className="tf-page-sub" style={{ margin: "4px 0 0", opacity: 0.7, fontSize: 14 }}>{subtitle}</p> : null}
        </div>
        {actions ? <div className="tf-page-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
      {filters ? <div className="tf-page-filters" style={{ marginBottom: 12 }}>{filters}</div> : null}
      <div className="tf-page-body">{children}</div>
    </div>
  )
}

export default PageShell
