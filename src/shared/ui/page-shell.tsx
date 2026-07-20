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
      {actions ? (
        <div className="tf-page-head" style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div className="tf-page-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
        </div>
      ) : null}
      {filters ? <div className="tf-page-filters" style={{ marginBottom: 12 }}>{filters}</div> : null}
      <div className="tf-page-body">{children}</div>
    </div>
  )
}

export default PageShell
