// Port 1:1 tu drawDonut() ban goc (taskflow_original.html dong 8091-8104):
// donut SVG ve bang stroke-dasharray/-dashoffset tren duong tron ban kinh
// 15.915 (chu vi = 100 don vi -> % truc tiep la do dai net ve).
// Dung chung cho Dashboard (#pvd-donut, #donut), Plan (#plan-donut-status,
// #plan-donut-result) va AuditPlan (#ap-donut-status) trong ban goc.
export type DonutSegment = { value: number; color: string }

export function DonutSvg({ segments, size = 110 }: { segments: DonutSegment[]; size?: number }) {
  const r = 15.915
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1
  let off = 25
  const arcs: { start: number; len: number; color: string }[] = []
  segments.forEach((s) => {
    if (s.value <= 0) return
    const len = (s.value / sum) * 100
    arcs.push({ start: off, len, color: s.color })
    off = (off - len + 100) % 100
  })
  return (
    <svg width={size} height={size} viewBox="0 0 42 42">
      <circle cx="21" cy="21" r={r} fill="var(--surface-small)" />
      {arcs.map((a, i) => (
        <circle
          key={i}
          cx="21"
          cy="21"
          r={r}
          fill="none"
          stroke={a.color}
          strokeWidth={6}
          strokeLinecap="butt"
          strokeDasharray={`${a.len} ${100 - a.len + 0.01}`}
          strokeDashoffset={a.start}
        />
      ))}
      {arcs.length > 1 && (
        <circle
          cx="21"
          cy="21"
          r={r}
          fill="none"
          stroke={arcs[0].color}
          strokeWidth={6}
          strokeLinecap="butt"
          strokeDasharray="0.01 99.99"
          strokeDashoffset={arcs[0].start}
        />
      )}
    </svg>
  )
}

export default DonutSvg
