import { NextResponse } from "next/server"
import { db } from "@/shared/lib/db"

// Trả về danh sách thành viên có session đăng nhập còn hạn trong 7 ngày gần đây
// (không quá 10 người), dùng cho component header avatar presence.
export const dynamic = "force-dynamic"

export type OnlineMember = {
  id: string
  name: string
  email: string | null
  avatar: string | null
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
    return NextResponse.json(rows ?? [])
  } catch {
    return NextResponse.json([])
  }
}
