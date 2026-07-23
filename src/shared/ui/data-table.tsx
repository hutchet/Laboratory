"use client"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { EmptyState } from "@/shared/ui/empty-state"

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  width?: number | string
  // Starting width in px when `resizable` is enabled on DataTable. Falls back to 140.
  defaultWidth?: number
  render: (row: T) => ReactNode
  // Khi khong set: tieu de (th) mac dinh can GIUA, noi dung (td) mac dinh can DAU
  // (trai) - theo dung rule chuan (y/c 23/07, 8:20 toi). Khi co set (vd "right" cho cot
  // gia tien), gia tri nay ap dung DONG THOI cho ca th va td cua cot do.
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
  // When set, wraps the table body in a fixed-height scroll container with a sticky
  // header (vertical scrollbar) instead of letting the table grow to fit all rows.
  maxBodyHeight?: number
  // Khi true: bang tu do chieu cao con lai cua man hinh (tinh tu vi tri cua bang xuong
  // den day khung nhin) thay cho mot con so maxBodyHeight co dinh - dung cho cac bang
  // la thanh phan cuoi cung cua trang, khong con the/thanh phan nao khac ben duoi (y/c
  // 23/07, 8:20 toi, muc 4). Tu dong cap nhat lai khi thay doi kich thuoc man hinh.
  fillHeight?: boolean
}

/** Standard table used by every list feature. Do not hand-roll <table> markup in feature pages. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyTitle = "Không có dữ liệu", emptyDescription, loading, resizable, maxBodyHeight, fillHeight }: DataTableProps<T>) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    columns.forEach((c) => { init[c.key] = c.defaultWidth ?? (typeof c.width === "number" ? c.width : 140) })
    return init
  })
  const dragRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [fillPx, setFillPx] = useState<number | undefined>(maxBodyHeight ?? 480)

  // Do chieu cao con lai cua man hinh tinh tu vi tri hien tai cua bang xuong day
  // khung nhin, roi dung con so nay lam max-height cho vung scroll cua bang (giu toi
  // thieu 220px de tranh bang bi be qua khi trinh duyet thap). Chay lai khi resize.
  useEffect(() => {
    if (!fillHeight) return
    function measure() {
      const el = containerRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const next = Math.max(220, window.innerHeight - top - 24)
      setFillPx(next)
    }
    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [fillHeight, rows.length])

  if (!loading && rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  // Ported from the original's mousedown/mousemove/mouseup drag handler on .col-resizer,
  // clamped to a 34px minimum column width like the original.
  function onResizeStart(key: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
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

  // Y/c 23/07, 11:10 toi, muc 1: cot dau tien (nhin thay duoc) khong duoc phep
  // chinh kich thuoc. Neu columns[0] la 1 cot chon dong/checkbox rat hep
  // (defaultWidth/width <= 48), cot do coi nhu an hinh va cot thuc su dau tien
  // trong mat nguoi dung la columns[1] - bo qua them 1 cot nua khoi resize.
  const firstWidth = columns[0] ? (columns[0].defaultWidth ?? (typeof columns[0].width === 'number' ? columns[0].width : undefined)) : undefined
  const leadingSkip = columns.length > 1 && firstWidth != null && firstWidth <= 48 ? 1 : 0

  const effectiveMaxHeight = fillHeight ? fillPx : maxBodyHeight
  const scrollable = !!effectiveMaxHeight

  return (
    <div
      ref={containerRef}
      data-tf-kit="data-table"
      style={{
        overflowX: "auto",
        overflowY: scrollable ? "auto" : undefined,
        maxHeight: effectiveMaxHeight,
        border: "1px solid var(--line)",
        borderRadius: 10,
      }}
    >
      <table style={{ width: resizable ? "max-content" : "100%", minWidth: resizable ? "100%" : undefined, borderCollapse: "collapse", fontSize: 13 }}>
        {resizable && (
          <colgroup>
            {columns.map((c) => <col key={c.key} style={{ width: widths[c.key] }} />)}
          </colgroup>
        )}
        <thead>
          <tr style={{ background: "var(--bg)", textAlign: "left" }}>
            {columns.map((c, i) => (
              <th
                key={c.key}
                style={{
                  padding: "10px 12px",
                  fontWeight: 600,
                  width: resizable ? widths[c.key] : c.width,
                  // Rule chuan: tieu de mac dinh can GIUA; cot co align rieng (vd gia tien
                  // can "right") thi ap dung dong bo ca tieu de va noi dung.
                  textAlign: c.align || "center",
                  // Cho phep chu xuong hang thu 2 khi keo hep cot (y/c 23/07, 9:05 toi -
                  // sua lai dung yeu cau ban dau: KHONG cat chu "...", de trinh duyet tu
                  // wrap va tang chieu cao dong khi can).
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  borderBottom: "1px solid var(--line)",
                  position: scrollable ? "sticky" : resizable ? "relative" : undefined,
                  top: scrollable ? 0 : undefined,
                  zIndex: scrollable ? 2 : undefined,
                  background: scrollable ? "var(--bg)" : undefined,
                }}
              >
                {c.header}
                {resizable && i > leadingSkip && i < columns.length - 1 && (
                  <span
                    className="col-resizer"
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
                style={{ cursor: onRowClick ? "pointer" : "default", borderBottom: "1px solid var(--line)" }}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      padding: "10px 12px",
                      // Rule chuan: noi dung mac dinh can DAU (trai); cot co align rieng (vd
                      // gia tien can "right") thi dung dung align do.
                      textAlign: c.align || "left",
                      // Khi keo hep cot lai, cho chu xuong hang thu 2 (dung yeu cau ban dau
                      // 23/07, 8:20 toi, sua lai theo phan hoi 23/07, 9:05 toi) - KHONG cat
                      // chu bang "...", de wordWrap tu nhien va chieu cao dong tu tang.
                      maxWidth: resizable ? widths[c.key] : undefined,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                    }}
                  >
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
