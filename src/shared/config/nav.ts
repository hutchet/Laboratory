export type NavItem = { href: string; label: string; dataPage: string; moduleId: string }
export type NavGroup = { heading: string; items: NavItem[] }

/** Single source of truth for sidebar — keep in sync with control/modules.json routes */
export const NAV_GROUPS: NavGroup[] = [
  { heading: "Tổng quan", items: [{ href: "/dash", label: "Tổng quan", dataPage: "dash", moduleId: "dashboard" }] },
  {
    heading: "Vận hành thử nghiệm",
    items: [
      { href: "/projects", label: "Dự án", dataPage: "projects", moduleId: "projects" },
      { href: "/centers", label: "Trung tâm thử nghiệm", dataPage: "centers", moduleId: "centers" },
      { href: "/customers", label: "Khách hàng", dataPage: "customers", moduleId: "customers" },
      { href: "/samples", label: "Quản lý Mẫu", dataPage: "samples", moduleId: "samples" },
      { href: "/plan", label: "Kế hoạch", dataPage: "plan", moduleId: "plan" },
    ],
  },
  {
    heading: "Thiết bị",
    items: [
      { href: "/equipment", label: "Thiết bị", dataPage: "equipment", moduleId: "equipment" },
      { href: "/equipment?tab=analytics", label: "Đặt lịch", dataPage: "analytics", moduleId: "bookings" },
      { href: "/quote?tab=quote-depreciation", label: "Khấu hao thiết bị", dataPage: "quote-depreciation", moduleId: "quotes" },
    ],
  },
  {
    heading: "BÁO GIÁ DỰ ÁN",
    items: [
      { href: "/quote?tab=quote-overview", label: "Tổng quan báo giá", dataPage: "quote-overview", moduleId: "quotes" },
      { href: "/quote?tab=quote-catalog", label: "Danh mục bài thử nghiệm", dataPage: "quote-catalog", moduleId: "quotes" },
      { href: "/quote?tab=quote-matrix", label: "Đơn giá thiết bị", dataPage: "quote-matrix", moduleId: "quotes" },
      { href: "/quote?tab=quote-personnel", label: "Đơn giá nhân sự", dataPage: "quote-personnel", moduleId: "quotes" },
      { href: "/quote?tab=quote-variable", label: "Chi phí biến đổi khác", dataPage: "quote-variable", moduleId: "quotes" },
    ],
  },
  { heading: "Báo cáo", items: [{ href: "/report", label: "Báo cáo", dataPage: "report", moduleId: "report" }] },
  {
    heading: "Nội bộ",
    items: [
      { href: "/tasks", label: "Công việc", dataPage: "tasks", moduleId: "tasks" },
      { href: "/members", label: "Thành viên", dataPage: "members", moduleId: "members" },
    ],
  },
  { heading: "Mua sắm", items: [{ href: "/purchase", label: "Theo dõi mua hàng", dataPage: "purchase", moduleId: "purchase" }] },
  {
    heading: "Hệ thống",
    items: [
      { href: "/auditplan", label: "Kế hoạch", dataPage: "auditplan", moduleId: "auditplan" },
      { href: "/quality", label: "Hệ thống quản lý chất lượng", dataPage: "quality", moduleId: "quality" },
      { href: "/settings", label: "Cài đặt", dataPage: "settings", moduleId: "settings" },
    ],
  },
]

export const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  dash: { title: "Tổng quan", subtitle: "Bảng điều khiển" },
  tasks: { title: "Công việc", subtitle: "Theo dõi và phân công" },
  projects: { title: "Dự án" },
  customers: { title: "Khách hàng" },
  centers: { title: "Trung tâm thử nghiệm" },
  samples: { title: "Quản lý Mẫu" },
  plan: { title: "Kế hoạch thử nghiệm" },
  equipment: { title: "Thiết bị" },
  analytics: { title: "Đặt lịch thiết bị" },
  "quote-overview": { title: "Tổng quan báo giá" },
  "quote-catalog": { title: "Danh mục bài thử nghiệm" },
  "quote-matrix": { title: "Đơn giá thiết bị" },
  "quote-personnel": { title: "Đơn giá nhân sự" },
  "quote-variable": { title: "Chi phí biến đổi khác" },
  "quote-depreciation": { title: "Khấu hao thiết bị" },
  report: { title: "Báo cáo" },
  members: { title: "Thành viên" },
  purchase: { title: "Theo dõi mua hàng" },
  auditplan: { title: "Kế hoạch kiểm toán" },
  quality: { title: "Hệ thống quản lý chất lượng" },
  settings: { title: "Cài đặt" },
}
