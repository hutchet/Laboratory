// Ham lay ty gia hoi doi REALTIME (yeu cau 23/07, 5:36 chieu) - goi API ty gia cong khai
// open.er-api.com (khong can API key, cap nhat ~24h/lan, ho tro CORS) de lay ty gia
// USD/CNY/GBP/INR theo VND. Chay o server (route handler /api/exchange-rate) vi:
// 1) tranh loi CORS goi truc tiep tu browser cho moi client, 2) dung fetch cache/
// revalidate cua Next.js de khong goi API ngoai lien tuc (revalidate 1800s = 30 phut).
// Sandbox phat trien KHONG co mang de test truc tiep loi fetch nay, nhung tren Vercel
// production co mang binh thuong. Neu fetch loi/timeout (mang chap chon, API sap) thi
// LUON fallback ve FALLBACK_RATES_PER_VND de trang khong bao gio vo/loi trang trang.

import { FALLBACK_RATES_PER_VND, type Currency, type ExchangeRates } from "./currency"

const EXCHANGE_API_URL = "https://open.er-api.com/v6/latest/VND"
const REVALIDATE_SECONDS = 1800
const FETCH_TIMEOUT_MS = 5000

type OpenErApiResponse = {
  result: string
  rates?: Record<string, number>
}

// Goi API ty gia realtime, tra ve he so quy doi 1 VND -> {USD,CNY,GBP,INR}. Neu API loi,
// tra timeout, hoac tra du lieu khong hop le -> tra ve fallback (source:"fallback") thay
// vi throw, de moi noi goi ham nay khong can try/catch rieng.
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    const res = await fetch(EXCHANGE_API_URL, {
      signal: controller.signal,
      next: { revalidate: REVALIDATE_SECONDS },
    })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`Exchange rate API status ${res.status}`)
    const data = (await res.json()) as OpenErApiResponse
    if (data.result !== "success" || !data.rates) throw new Error("Exchange rate API invalid payload")
    const pick = (code: Currency): number => {
      const v = data.rates?.[code]
      return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : FALLBACK_RATES_PER_VND[code]
    }
    return {
      ratesPerVnd: {
        VND: 1,
        USD: pick("USD"),
        CNY: pick("CNY"),
        GBP: pick("GBP"),
        INR: pick("INR"),
      },
      updatedAt: new Date().toISOString(),
      source: "live",
    }
  } catch {
    return {
      ratesPerVnd: { ...FALLBACK_RATES_PER_VND },
      updatedAt: new Date().toISOString(),
      source: "fallback",
    }
  }
}
