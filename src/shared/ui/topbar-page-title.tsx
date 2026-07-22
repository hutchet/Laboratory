"use client"
import { usePathname, useSearchParams } from "next/navigation"

const TITLES: Record<string, string> = {
  "/dash": "Tổng quan",
  "/projects": "Dự án",
  "/tasks": "Công việc",
  "/centers": "Trung tâm thử nghiệm",
  "/customers": "Khách hàng",
  "/samples": "Quản lý mẫu",
  "/members": "Thành viên",
  "/equipment": "Thiết bị",
  "/plan": "Kế hoạch thử nghiệm",
  "/auditplan": "Kế hoạch kiểm định",
  "/quality": "Kiểm soát chất lượng",
  "/report": "Báo cáo",
  "/purchase": "Mua hàng",
  "/settings": "Cài đặt",
}

// Trang /quote dung 1 route duy nhat + query ?tab=... (xem app/(app)/quote/page.tsx),
// nen usePathname() luon tra ve "/quote" cho MOI tab con — cac key "/quotes/..." cu
// (so nhieu, dang path rieng) khong bao gio khop, khien tieu de topbar bi rong cho
// toan bo cac trang bao gia (vd: Khau hao thiet bi). Phai doc tab tu query string.
const QUOTE_TITLES: Record<string, string> = {
  "quote-overview": "Báo giá - Tổng quan",
  "quote-catalog": "Danh mục báo giá",
  "quote-matrix": "Ma trận báo giá",
  "quote-personnel": "Nhân sự báo giá",
  "quote-depreciation": "Khấu hao thiết bị",
  "quote-variable": "Chi phí biến đổi",
}

export function TopbarPageTitle() {
  const path = usePathname()
  const searchParams = useSearchParams()

  if (path.startsWith("/quote")) {
    const tab = searchParams.get("tab") || "quote-overview"
    return <>{QUOTE_TITLES[tab] ?? ""}</>
  }

  // Exact match first, then prefix match (longest first)
  const title =
    TITLES[path] ??
    (Object.entries(TITLES)
      .filter(([k]) => path.startsWith(k) && k !== "/")
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "")
  return <>{title}</>
}
