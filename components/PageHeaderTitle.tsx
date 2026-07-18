"use client"

import { usePathname, useSearchParams } from "next/navigation"

// Dong bo 1:1 voi PAGE_META trong js/13-navigation.js (ban HTML goc) - tieu de
// dong theo tung trang, thay the cho dong chu "Xin chao" tinh (khong dung voi
// ban goc, noi tieu de header doi theo trang dang xem qua #page-title).
const PAGE_META: Record<string, string> = {
  dash: "Tổng quan",
  tasks: "Công việc",
  projects: "Dự án",
  centers: "Trung tâm thử nghiệm",
  customers: "Khách hàng",
  samples: "Quản lý Mẫu",
  quality: "Hệ thống quản lý chất lượng",
  "quote-overview": "Tổng quan báo giá",
  "quote-catalog": "Danh mục bài thử nghiệm",
  "quote-matrix": "Đơn giá thiết bị",
  "quote-personnel": "Đơn giá nhân sự",
  "quote-depreciation": "Khấu hao thiết bị",
  "quote-variable": "Chi phí biến đổi khác",
  members: "Thành viên",
  report: "Báo cáo",
  analytics: "Đặt lịch thiết bị",
  equipment: "Thiết bị",
  plan: "Kế hoạch thử nghiệm",
  settings: "Cài đặt",
  auditplan: "Kế hoạch",
  purchase: "Theo dõi mua hàng",
}

function resolveDataPage(pathname: string, tab: string | null): string {
  if (pathname.startsWith("/quote")) return tab || "quote-overview"
  if (pathname.startsWith("/equipment")) return tab || "equipment"
  const seg = pathname.split("/").filter(Boolean)[0]
  return seg || "dash"
}

export default function PageHeaderTitle() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const dataPage = resolveDataPage(pathname, searchParams.get("tab"))
  const title = PAGE_META[dataPage] || PAGE_META.dash
  return (
    <div className="hello">
      <h2 id="page-title">{title}</h2>
    </div>
  )
}
