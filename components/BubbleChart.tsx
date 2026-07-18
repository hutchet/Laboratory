"use client"

// Ha tang chart bong bong dung chung, thay ban tu ve rieng o Dash truoc day.

export type BubbleDatum = { label: string; value: number; color?: string }

export function BubbleChart({
  data,
  minSize = 40,
  maxExtra = 50,
  emptyLabel = "Chưa có dữ liệu.",
}: {
  data: BubbleDatum[]
  minSize?: number
  maxExtra?: number
  emptyLabel?: string
}) {
  if (data.length === 0) return <div className="empty">{emptyLabel}</div>
  const maxValue = Math.max(1, ...data.map((d) => d.value))
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
      {data.map((d) => {
        const ratio = d.value / maxValue
        const size = minSize + ratio * maxExtra
        return (
          <div key={d.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 78 }}>
            <div
              title={`${d.label}: ${d.value}`}
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: d.color || "var(--pri)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {d.value}
            </div>
            <div style={{ fontSize: 11.5, textAlign: "center", color: "var(--muted)", lineHeight: 1.2 }}>{d.label}</div>
          </div>
        )
      })}
    </div>
  )
}
