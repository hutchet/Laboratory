import type { KpiCardTrend } from "@/shared/ui/kpi-card"

// Generic trend calculator cho bất kỳ danh sách item nào có createdAt.
// Đếm số item thỏa filterFn tại thời điểm hiện tại và 7 ngày trước.
// Sparkline: 7 điểm (mỗi điểm là số lượng cuối ngày trong 7 ngày qua).
export function computeSimpleTrend<T>(
  items: T[],
  filterFn: (item: T) => boolean,
  getCreatedAt: (item: T) => string | Date,
): KpiCardTrend {
  const now = Date.now()
  const DAY = 86400000
  const weekAgo = now - 7 * DAY

  const currCount = items.filter((it) => filterFn(it) && new Date(getCreatedAt(it)).getTime() <= now).length
  const prevCount = items.filter((it) => filterFn(it) && new Date(getCreatedAt(it)).getTime() <= weekAgo).length

  // pctChg
  let pct: number
  let up: boolean | null
  if (prevCount === 0) {
    if (currCount === 0) { pct = 0; up = null }
    else { pct = 100; up = true }
  } else {
    const raw = Math.round(((currCount - prevCount) / prevCount) * 100)
    if (raw === 0) { pct = 0; up = null }
    else { pct = Math.abs(raw); up = raw > 0 }
  }

  // Sparkline: 7 ngày
  const sparkline: number[] = []
  for (let i = 6; i >= 0; i--) {
    const asOf = now - i * DAY
    const count = items.filter((it) => filterFn(it) && new Date(getCreatedAt(it)).getTime() <= asOf).length
    sparkline.push(count)
  }

  return { pct, up, sparkline }
}
