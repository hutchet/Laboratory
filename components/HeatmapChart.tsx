"use client"

// Ha tang bieu do heatmap dung chung. Trong ban goc "Heatmap" chi la chu mo ta
// trong 1 tooltip ("Tinh trang thiet bi (Heatmap)"), chua tung la chart thuc su.
// Component nay hien thuc hoa thanh 1 luoi mau theo cuong do gia tri, dung
// cho khoi "Tinh trang thiet bi theo nhom (7 ngay qua)" o trang Dat lich thiet bi.

export type HeatmapCell = { rowLabel: string; colLabel: string; value: number }

function intensityColor(ratio: number) {
  const alpha = 0.08 + ratio * 0.72
  return `rgba(217, 119, 6, ${alpha.toFixed(3)})`
}

export function HeatmapChart({
  rowLabels,
  colLabels,
  cells,
  emptyLabel = "Chưa có dữ liệu.",
}: {
  rowLabels: string[]
  colLabels: string[]
  cells: HeatmapCell[]
  emptyLabel?: string
}) {
  const maxValue = Math.max(1, ...cells.map((c) => c.value))
  const lookup = new Map(cells.map((c) => [`${c.rowLabel}__${c.colLabel}`, c.value]))

  if (rowLabels.length === 0) return <div className="empty">{emptyLabel}</div>

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "4px 8px", color: "var(--muted)" }}></th>
            {colLabels.map((c) => (
              <th key={c} style={{ padding: "4px 8px", color: "var(--muted)", fontWeight: 500 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((r) => (
            <tr key={r}>
              <td style={{ padding: "4px 8px", fontWeight: 600, whiteSpace: "nowrap" }}>{r}</td>
              {colLabels.map((c) => {
                const v = lookup.get(`${r}__${c}`) ?? 0
                const ratio = v / maxValue
                return (
                  <td
                    key={c}
                    title={`${r} · ${c}: ${v}`}
                    style={{
                      padding: "6px 10px",
                      textAlign: "center",
                      background: intensityColor(ratio),
                      borderRadius: 4,
                      minWidth: 30,
                    }}
                  >
                    {v > 0 ? v : ""}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
