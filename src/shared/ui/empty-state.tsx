import type { ReactNode } from "react"

export type EmptyStateProps = { title: string; description?: string; action?: ReactNode; icon?: ReactNode }

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div
      data-tf-kit="empty-state"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "48px 16px",
        gap: 8,
        color: "#5b6572",
      }}
    >
      {icon}
      <div style={{ fontSize: 16, fontWeight: 600, color: "#1f2430" }}>{title}</div>
      {description ? <div style={{ fontSize: 13, maxWidth: 360 }}>{description}</div> : null}
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  )
}

export default EmptyState
