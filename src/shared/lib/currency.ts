// Module quy doi & hien thi tien te da don vi (yeu cau 23/07, 5:36 chieu): toan bo so
// tien luu trong DB van la VND (base currency, khong doi schema) - truong "currency"
// trong Cai dat chi doi DON VI HIEN THI tren UI bang cach quy doi qua ty gia realtime
// (xem exchangeRate.ts). Vi vay moi noi hien thi tien can doi tu fmtVND(n) sang
// useCurrency().format(n) (n van la so VND goc tu DB).

export type Currency = "VND" | "USD" | "CNY" | "GBP" | "INR"

export const CURRENCY_COOKIE = "tf_currency_v1"

export type CurrencyOption = { value: Currency; label: string; symbol: string; locale: string }

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { value: "VND", label: "VNĐ — Việt Nam Đồng", symbol: "đ", locale: "vi-VN" },
  { value: "USD", label: "USD — Đô la Mỹ", symbol: "$", locale: "en-US" },
  { value: "CNY", label: "CNY — Nhân dân tệ (Trung Quốc)", symbol: "¥", locale: "zh-CN" },
  { value: "GBP", label: "GBP — Bảng Anh", symbol: "£", locale: "en-GB" },
  { value: "INR", label: "INR — Rupee (Ấn Độ)", symbol: "₹", locale: "en-IN" },
]

export function isCurrency(v: string | undefined | null): v is Currency {
  return !!v && CURRENCY_OPTIONS.some((c) => c.value === v)
}

export function currencyOption(c: Currency): CurrencyOption {
  return CURRENCY_OPTIONS.find((o) => o.value === c) || CURRENCY_OPTIONS[0]
}

// Ty gia du phong (don vi ngoai te / 1 VND) - CHI dung khi khong goi duoc API ty gia
// realtime (vi du mat mang tam thoi). Cap nhat gan dung theo ty gia tham khao 23/07/2026
// (1 USD ~ 25.400 VND). Cac dong khac suy ra qua USD.
export const FALLBACK_RATES_PER_VND: Record<Currency, number> = {
  VND: 1,
  USD: 1 / 25400,
  CNY: (1 / 25400) * 7.25,
  GBP: (1 / 25400) * 0.79,
  INR: (1 / 25400) * 83.5,
}

export type ExchangeRates = {
  // He so quy doi: 1 VND = ratesPerVnd[currency] don vi ngoai te do.
  ratesPerVnd: Record<Currency, number>
  updatedAt: string
  source: "live" | "fallback"
}

// Quy doi 1 so tien goc VND (amountVnd) sang currency dich roi format theo locale cua
// dong tien do. Luon nhan rates tu context (useCurrency) - khong tu fetch o day de ham
// nay dung duoc ca o server va client (pure function).
export function formatMoney(amountVnd: number, currency: Currency, rates: Record<Currency, number>): string {
  const safeAmount = Number.isFinite(amountVnd) ? amountVnd : 0
  const opt = currencyOption(currency)
  if (currency === "VND") {
    return `${Math.round(safeAmount).toLocaleString("vi-VN")} đ`
  }
  const rate = rates[currency] ?? FALLBACK_RATES_PER_VND[currency]
  const converted = safeAmount * rate
  const formatted = converted.toLocaleString(opt.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${opt.symbol}${formatted}`
}
