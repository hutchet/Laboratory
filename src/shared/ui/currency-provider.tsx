"use client"

// Context tien te toan app (yeu cau 23/07, 5:36 chieu): cung cap {currency, rates, format}
// cho moi component client can hien thi tien theo don vi nguoi dung chon o Cai dat.
// - currency: doc tu cookie (server truyen initialCurrency), doi ngay lap tuc khi nguoi
//   dung luu Cai dat (khong doi trang) qua setCurrency().
// - rates: fetch tu /api/exchange-rate (route server goi API ty gia realtime), cache lai
//   trong localStorage kem timestamp de khong goi lai API qua nhieu lan trong 1 gio;
//   luon co fallback ngay lap tuc (FALLBACK_RATES_PER_VND) truoc khi fetch xong, tranh
//   nhap nhay/loi khi hien thi lan dau.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { CURRENCY_COOKIE, FALLBACK_RATES_PER_VND, formatMoney, type Currency } from "@/shared/lib/currency"

const RATES_CACHE_KEY = "tf_exchange_rates_v1"
const RATES_MAX_AGE_MS = 60 * 60 * 1000 // 1 gio

type RatesState = { ratesPerVnd: Record<Currency, number>; updatedAt: string; source: "live" | "fallback" | "cache" }

type CurrencyContextValue = {
  currency: Currency
  setCurrency: (c: Currency) => void
  rates: RatesState
  refreshRates: () => void
  format: (amountVnd: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

function readCache(): RatesState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(RATES_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RatesState & { fetchedAtMs: number }
    if (Date.now() - parsed.fetchedAtMs > RATES_MAX_AGE_MS) return null
    return { ratesPerVnd: parsed.ratesPerVnd, updatedAt: parsed.updatedAt, source: "cache" }
  } catch {
    return null
  }
}

function writeCache(state: RatesState) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ...state, fetchedAtMs: Date.now() }))
  } catch {
    // localStorage co the bi chan (private mode) - bo qua, khong anh huong chuc nang chinh.
  }
}

export function CurrencyProvider({ initialCurrency, children }: { initialCurrency: Currency; children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(initialCurrency)
  const [rates, setRates] = useState<RatesState>(
    () => readCache() || { ratesPerVnd: { ...FALLBACK_RATES_PER_VND }, updatedAt: new Date().toISOString(), source: "fallback" },
  )
  const fetchedOnce = useRef(false)

  const refreshRates = useCallback(() => {
    fetch("/api/exchange-rate", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ratesPerVnd: Record<Currency, number>; updatedAt: string; source: "live" | "fallback" } | null) => {
        if (!data) return
        setRates(data)
        writeCache(data)
      })
      .catch(() => {
        // Giu nguyen rates hien tai (fallback hoac cache cu) neu khong goi duoc API - khong
        // lam gian doan hien thi cua nguoi dung.
      })
  }, [])

  useEffect(() => {
    if (fetchedOnce.current) return
    fetchedOnce.current = true
    // Neu cache con moi (< 1 gio) thi da co gia tri hop ly ngay tu useState init o tren,
    // van goi lai 1 lan de dam bao ty gia moi nhat khi nguoi dung thuc su can quy doi.
    refreshRates()
  }, [refreshRates])

  const setCurrency = useCallback((c: Currency) => {
    setCurrencyState(c)
    if (typeof document !== "undefined") {
      document.cookie = `${CURRENCY_COOKIE}=${c}; path=/; max-age=${60 * 60 * 24 * 365}`
    }
  }, [])

  const format = useCallback((amountVnd: number) => formatMoney(amountVnd, currency, rates.ratesPerVnd), [currency, rates])

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, setCurrency, rates, refreshRates, format }),
    [currency, setCurrency, rates, refreshRates, format],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (!ctx) {
    // Fallback an toan cho component nao vo tinh render ngoai CurrencyProvider (khong nen
    // xay ra vi Provider dat o RootLayout) - tranh crash toan trang, mac dinh VND 1:1.
    return {
      currency: "VND",
      setCurrency: () => {},
      rates: { ratesPerVnd: { ...FALLBACK_RATES_PER_VND }, updatedAt: new Date().toISOString(), source: "fallback" },
      refreshRates: () => {},
      format: (amountVnd: number) => formatMoney(amountVnd, "VND", FALLBACK_RATES_PER_VND),
    }
  }
  return ctx
}
