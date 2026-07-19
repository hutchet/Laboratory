/** Runtime mirror of control/modules.json (subset). Update alongside control/modules.json. */
export type ModuleStatus = "pending" | "in_progress" | "done" | "blocked"

export type ModuleMeta = { id: string; title: string; route: string | null; status: ModuleStatus; phase: string }

export const MODULES: ModuleMeta[] = [
  { id: "_platform", title: "Platform", route: null, status: "in_progress", phase: "P0" },
  { id: "_kit", title: "Shared UI Kit", route: null, status: "pending", phase: "P1" },
  { id: "tasks", title: "Công việc", route: "/tasks", status: "pending", phase: "P2" },
  { id: "projects", title: "Dự án", route: "/projects", status: "pending", phase: "P3" },
  { id: "customers", title: "Khách hàng", route: "/customers", status: "pending", phase: "P3" },
  { id: "centers", title: "Trung tâm TN", route: "/centers", status: "pending", phase: "P3" },
  { id: "samples", title: "Mẫu", route: "/samples", status: "pending", phase: "P3" },
  { id: "members", title: "Thành viên", route: "/members", status: "pending", phase: "P3" },
  { id: "equipment", title: "Thiết bị", route: "/equipment", status: "pending", phase: "P4" },
  { id: "bookings", title: "Đặt lịch", route: "/equipment?tab=analytics", status: "pending", phase: "P4" },
  { id: "quotes", title: "Báo giá", route: "/quote", status: "pending", phase: "P4" },
  { id: "plan", title: "Kế hoạch TN", route: "/plan", status: "pending", phase: "P5" },
  { id: "auditplan", title: "Kế hoạch KT", route: "/auditplan", status: "pending", phase: "P5" },
  { id: "purchase", title: "Mua sắm", route: "/purchase", status: "pending", phase: "P5" },
  { id: "quality", title: "QLCL", route: "/quality", status: "pending", phase: "P5" },
  { id: "dashboard", title: "Tổng quan", route: "/dash", status: "pending", phase: "P5" },
  { id: "report", title: "Báo cáo", route: "/report", status: "pending", phase: "P5" },
  { id: "settings", title: "Cài đặt", route: "/settings", status: "pending", phase: "P5" },
]

export function getModule(id: string) {
  return MODULES.find((m) => m.id === id)
}
