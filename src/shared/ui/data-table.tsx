"use client"
import type { ReactNode } from "react"
import { useRef, useState } from "react"
import { EmptyState } from "@/shared/ui/empty-state"

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  width?: number | string
  // Starting width in px when `resizable` is enabled on DataTable. Falls back to 140.
  defaultWidth?: number
  render: (row: T) => ReactNode
  align?: "left" | "right" | "center"
}

export type DataTableProps<T> = {
  columns: Array<DataTableColumn<T>>
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
  loading?: boolean
  // Ported from the original app's ensureTableResizers/.col-resizer drag handles.
  // When true, every column except the first and last gets a draggable resize handle.
  resizable?: boolean
}

/** Standard table used by every list feature. Do not hand-roll <table> markup in feature pages. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyTitle = "Không có dữ liệu", emptyDescription, loading, resizable }: DataTableProps<T>) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    columns.forEach((c) => { init[c.key] = c.defaultWidth ?? (typeof c.width === "number" ? c.width : 140) })
    return init
  })
  const dragRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null)

  if (!loading && rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  // Ported from the original's mousedown/mousemove/mouseup drag handler on .col-resizer,
  // clamped to a 34px minimum column width like the original.
  function onResizeStart(key: string, e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { key, startX: e.clientX, startWidth: widths[key] ?? 140 }
    function onMove(ev: MouseEvent) {
      const d = dragRef.current
      if (!d) return
      const next = Math.max(34, d.startWidth + (ev.clientX - d.startX))
      setWidths((prev) => ({ ...prev, [d.key]: next }))
    }
    function onUp() {
      dragRef.current = null
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  return (
    <div data-tf-kit="data-table" style={{ overflowX: "auto", border: "1px solid #e7eaee", borderRadius: 10 }}>
      <table style={{ width: resizable ? "max-content" : "100%", minWidth: resizable ? "100%" : undefined, borderCollapse: "collapse", fontSize: 13 }}>
        {resizable && (
          <colgroup>
            {columns.map((c) => <col key={c.key} style={{ width: widths[c.key] }} />)}
          </colgroup>
        )}
        <thead>
          <tr style={{ background: "#f7f8fa", textAlign: "left" }}>
            {columns.map((c, i) => (
              <th
                key={c.key}
                style={{
                  padding: "10px 12px",
                  fontWeight: 600,
                  width: resizable ? widths[c.key] : c.width,
                  textAlign: c.align || "left",
                  whiteSpace: "nowrap",
                  borderBottom: "1px solid #e7eaee",
                  position: resizable ? "relative" : undefined,
                }}
              >
                {c.header}
                {resizable && i > 0 && i < columns.length - 1 && (
                  <span
                    onMouseDown={(e) => onResizeStart(c.key, e)}
                    style={{ position: "absolute", right: -3, top: 0, width: 6, height: "100%", cursor: "col-resize", userSelect: "none" }}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 24, textAlign: "center", opacity: 0.6 }}>
                Đang tải...
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ cursor: onRowClick ? "pointer" : "default", borderBottom: "1px solid #f0f1f3" }}
              >
                {columns.map((c) => (
                  <td key={c.key} style={{ padding: "10px 12px", textAlign: c.align || "left" }}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

export default DataTable
