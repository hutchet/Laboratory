import { NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { isActive } from "@/shared/lib/presence-store"

// Trả về danh sách thành viên có session đăng nhập còn hạn trong 7 ngày gần đây
// (không quá 10 người), dùng cho component header avatar presence.
// Fix bao cao 1:40 PM muc 6: bo sung co "active" (dang thuc su hoat dong - co heartbeat
// gan day, xem shared/lib/presence-store.ts) de client phan biet hien thi vong tron
// quanh icon (active) voi chi hien icon khong vien (dang nhap nhung khong hoat dong),
// giong co che presence cua Excel Office 365.
export const dynamic = "force-dynamic"

export type OnlineMember = {
	id: string
	name: string
	email: string | null
	avatar: string | null
	active: boolean
}

export async function GET() {
	try {
		const rows = await db.$queryRawUnsafe<Array<{
			id: string; name: string; email: string | null; avatar: string | null
		}>>(
			`SELECT DISTINCT ON (m.id) m.id, m.name, m.email, m.avatar
       FROM "Session" s
       JOIN "User" u ON u.id = s."userId"
       JOIN "Member" m ON m.email = u.email
       WHERE s.expires > NOW() - INTERVAL '7 days'
       ORDER BY m.id, s.expires DESC
       LIMIT 10`
		)
		const result: OnlineMember[] = (rows ?? []).map((r) => ({ ...r, active: isActive(r.email) }))
		return NextResponse.json(result)
	} catch {
		return NextResponse.json([])
	}
}
