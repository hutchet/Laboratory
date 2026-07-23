// Bo nho tam trong tien trinh (module-level singleton) ghi lai "heartbeat" gan nhat
// cua tung tai khoan (theo email) - dung de phan biet "dang hoat dong" (co heartbeat
// trong ACTIVE_WINDOW_MS gan day, client goi POST /api/heartbeat moi 30s trong khi tab
// dang mo) voi "da dang nhap nhung khong hoat dong" (session con han nhung khong con
// gui heartbeat - vi du dong tab/khoa may). Theo yeu cau bao cao 1:40 PM muc 6 (co che
// hien thi presence giong Excel Office 365: vong tron quanh icon = dang hoat dong).
//
// Luu y: day la bo nho trong tien trinh, phu hop moi truong 1 instance (dev/hobby).
const lastSeen = new Map<string, number>()

export const ACTIVE_WINDOW_MS = 90_000 // 90s - qua 3 chu ky heartbeat (30s) coi la ngung hoat dong

export function recordHeartbeat(email: string) {
	if (!email) return
	lastSeen.set(email, Date.now())
}

export function isActive(email: string | null | undefined): boolean {
	if (!email) return false
	const t = lastSeen.get(email)
	return !!t && Date.now() - t <= ACTIVE_WINDOW_MS
}
