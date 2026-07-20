"use client"
import { usePathname } from "next/navigation"

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
  "/quotes/overview": "Báo giá - Tổng quan",
  "/quotes/catalog": "Danh mục báo giá",
  "/quotes/matrix": "Ma trận báo giá",
  "/quotes/personnel": "Nhân sự báo giá",
  "/quotes/depreciation": "Khấu hao",
  "/quotes/variable": "Chi phí biến đổi",
}

export function TopbarPageTitle() {
  const path = usePathname()
  // Exact match first, then prefix match (longest first)
  const title =
    TITLES[path] ??
    (Object.entries(TITLES)
      .filter(([k]) => path.startsWith(k) && k !== "/")
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? "")
  return <>{title}</>
}
