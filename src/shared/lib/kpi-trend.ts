// Trend KPI dung data thuc (2026-07-20, ban ah) - dung chung cho cac trang
// Du an/Trung tam/Khach hang (moi trang tu tinh tren list cua minh, xem
// features/dashboard/compute.ts computeKpiTrend cho ban goc cua ky thuat nay).
//
// Ky thuat: dem so item "da ton tai" (createdAt <= asOf) thoa dieu kien matches,
// tai 2 moc thoi gian (hien tai vs 7 ngay truoc) - giong kpiSnapshot() cua Dashboard.
//
// Neu du lieu chua du 7 ngay lich su (VD: vua chay migration them field createdAt,
// hoac vua nhap du lieu demo cung luc) thi KHONG the tinh % tang truong dung nghia -
// tra ve duong thang (flat sparkline, pct 0) de tranh hien so gia/gay nham lan,
// dung nhu yeu cau: "neu chua co gi thi trend la duong thang, don gian".

export type SimpleTrend = { pct: number; up: boolean; sparkline?: number[] }

const WEEK_MS = 7 * 86400000

function countAsOf<T extends { createdAt: string }>(
	items: T[],
	asOfMs: number,
	matches: (item: T) => boolean,
): number {
	return items.filter((i) => new Date(i.createdAt).getTime() <= asOfMs && matches(i)).length
}

export function computeSimpleTrend<T extends { createdAt: string }>(
	items: T[],
	matches: (item: T) => boolean = () => true,
): SimpleTrend {
	const now = Date.now()
	const curr = countAsOf(items, now, matches)
	const oldestMs = items.length ? Math.min(...items.map((i) => new Date(i.createdAt).getTime())) : now
	const hasHistory = now - oldestMs >= WEEK_MS
	if (!hasHistory) {
		// Chua du 7 ngay du lieu thuc -> duong thang, khong bien mui ten/%.
		return { pct: 0, up: true, sparkline: [curr, curr] }
	}
	const prev = countAsOf(items, now - WEEK_MS, matches)
	if (prev === 0) {
		return curr === 0 ? { pct: 0, up: true, sparkline: [curr, curr] } : { pct: 100, up: true, sparkline: [0, curr] }
	}
	const pct = Math.round(((curr - prev) / prev) * 100)
	return { pct: Math.abs(pct), up: pct >= 0, sparkline: [prev, curr] }
}
