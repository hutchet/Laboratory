import { NextResponse } from "next/server"
import { getExchangeRates } from "@/shared/lib/exchangeRate"

export const dynamic = "force-dynamic"

// GET /api/exchange-rate - dung cho CurrencyProvider (client) de lay ty gia realtime
// khi doi don vi tien te o trang Cai dat / khi tai lai trang. Luon tra 200 (khong bao
// gio 500) vi getExchangeRates() da tu fallback khi API ngoai loi.
export async function GET() {
  const rates = await getExchangeRates()
  return NextResponse.json(rates)
}
