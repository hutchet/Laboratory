import { NextResponse } from "next/server"
import { auth } from "@/shared/lib/auth"
import { recordHeartbeat } from "@/shared/lib/presence-store"

// Nhan "heartbeat" tu client (OnlineAvatars, moi 30s trong khi tab dang mo) de ghi
// nhan tai khoan dang thuc su hoat dong - xem shared/lib/presence-store.ts.
export const dynamic = "force-dynamic"

export async function POST() {
	const session = await auth()
	const email = session?.user?.email
	if (email) recordHeartbeat(email)
	return NextResponse.json({ ok: true })
}
