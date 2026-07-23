import { NextResponse } from "next/server"
import { seedQuoteData } from "@/server/seedQuoteData"

export const dynamic = "force-dynamic"

// Truy cập URL này 1 lần sau khi deploy để nạp dữ liệu thật từ file Excel
// "200526_Khung chi phí kiểm thử_final.xlsx" vào Danh mục báo giá, Đơn giá thiết bị,
// Đơn giá nhân sự. Có thể gọi lại nhiều lần an toàn (idempotent).
export async function GET() {
  try {
    const log = await seedQuoteData()
    return NextResponse.json({ ok: true, log })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
