// Port 1:1 tu VF_DICT + vfApplyI18n (taskflow_original.html dong ~8143-8199, comment
// goc "v105 item5: real i18n dictionary + text-swap engine"). Co che goc: mot dictionary
// vi->en, duyet toan bo text node trong <body> bang TreeWalker va thay the chuoi khop
// chinh xac (sau khi trim) — KHONG can boc tung chuoi trong ham dich rieng o moi component.
// Ung dung o day dung dung y tuong: chi can 1 danh sach dictionary + 1 ham quet DOM,
// khong phai sua tung component sang dang t("key").

export const LANG_COOKIE = "tf_lang_v1"

// Giu nguyen tung cap chuoi vi/en tu VF_DICT ban goc (khong dich lai, khong bo sung thu tu).
export const VF_DICT: Record<string, string> = {
  "Tổng quan": "Overview",
  "Dự án": "Project",
  "Khách hàng": "Customers",
  "Quản lý Mẫu": "Sample management",
  "Kế hoạch": "Plan",
  "Thiết bị": "Equipment",
  "Đặt lịch": "Booking",
  "Khấu hao thiết bị": "Equipment depreciation",
  "Tổng quan báo giá": "Quotes overview",
  "Danh mục bài thử nghiệm": "Test catalog",
  "Đơn giá thiết bị": "Equipment pricing",
  "Đơn giá nhân sự": "Personnel pricing",
  "Chi phí biến đổi khác": "Other variable costs",
  "Báo cáo": "Reports",
  "Công việc": "Tasks",
  "Thành viên": "Members",
  "Chất lượng & Hệ thống": "Quality & Systems",
  "Cài đặt": "Settings",
  "Đăng xuất": "Log out",
  "+ Tạo báo giá": "+ New quote",
  "+ Thêm vào báo giá": "+ Add to quote",
  "Bảng báo giá": "Quotes table",
  "Tìm kiếm báo giá...": "Search quotes...",
  "← Danh sách": "← List",
  "Tạo báo giá": "Create quote",
  "Sửa báo giá": "Edit quote",
  "Nháp": "Draft",
  "Đã lưu": "Saved",
  "Đã lưu báo giá": "Quote saved",
  "Thông tin báo giá": "Quote information",
  "Thêm bài thử nghiệm": "Add test item",
  "Hạng mục báo giá": "Quote items",
  "Click vào ô để sửa": "Click a cell to edit",
  "Số thứ tự": "No.",
  "Tên hạng mục": "Item name",
  "Tiêu chuẩn": "Standard",
  "Đơn giá": "Unit price",
  "Số lượng": "Quantity",
  "Thành tiền": "Amount",
  "Khách hàng *": "Customer *",
  "Số báo giá": "Quote number",
  "Ngày lập": "Date issued",
  "Người lập": "Prepared by",
  "Điều khoản / Ghi chú": "Terms / Notes",
  "Tổng giá trị": "Total value",
  "Giá trị TB": "Average value",
  "Tháng này": "This month",
  "Báo giá": "Quotes",
  "Phân bổ giá trị dự án": "Project value distribution",
  "thuộc dự án dẫn đầu": "in top project",
  "Tổng": "Total",
  "Cân bằng": "Balanced",
  "Quá tải": "Overloaded",
  "Áp lực cao": "High pressure",
  "Cường độ cao": "High intensity",
  "Đúng tiến độ": "On schedule",
  "Hoàn thành": "Completed",
  "Ngôn ngữ": "Language",
  "Giao diện": "Appearance",
  "Phông chữ": "Typeface",
  "Quản lý và theo dõi toàn bộ công việc": "Manage and track all tasks",
  "Tổng quan tất cả dự án của nhóm": "Overview of all team projects",
  "Quản lý thông tin khách hàng gửi mẫu thử nghiệm": "Manage customer information for test samples",
  "Quote overview": "Quote overview",
  "Danh mục bài thử nghiệm ": "Test item catalog",
  "Đơn giá thiết bị ": "Equipment unit price",
  "Đơn giá nhân sự ": "Personnel unit price",
  "Thành viên ": "Members",
  "Quản lý thành viên trong nhóm": "Manage team members",
  "Đặt lịch thiết bị": "Equipment booking",
  "Kế hoạch thử nghiệm": "Test plan",
  "Dự án/nội bộ": "Project/internal",
  "Công việc đang hoạt động": "Active tasks",
  "Dự án có rủi ro": "At-risk projects",
  "theo dự án": "by project",
  "chưa hoàn thành": "not completed",
  "Người dùng": "User",
  "Vai trò truy cập": "Access role",
  "Vai trò hiện tại của bạn": "Your current role",
  "Trung tâm thử nghiệm": "Testing center",
  "Quản lý trung tâm và liên kết dự án, nhân sự, thiết bị, khách hàng":
    "Manage centers and link projects, personnel, equipment, customers",
  "Tổng trung tâm": "Total centers",
  "Tổng dự án liên kết": "Total linked projects",
  "Tổng giá trị dự án": "Total project value",
  "Khách hàng liên quan": "Related customers",
  "Tất cả trung tâm thử nghiệm": "All testing centers",
  "Tìm trung tâm...": "Search centers...",
  "Trung tâm mới": "New center",
  "Tên trung tâm *": "Center name *",
  "VD: Trung tâm thử nghiệm Pin": "e.g. Battery testing center",
  "Người quản lý": "Manager",
  "VD: Nguyễn Văn A": "e.g. John Smith",
  "Số điện thoại": "Phone number",
  "Địa chỉ": "Address",
  "Địa chỉ trung tâm": "Center address",
  "Ghi chú": "Notes",
  "Ghi chú thêm": "Additional notes",
  "+ Thêm trung tâm": "+ Add center",
  "Hủy": "Cancel",
  "Chưa có trung tâm nào. Nhấn": "No centers yet. Click",
  "để thêm.": "to add one.",
  "Sơ đồ tiến độ (Gantt) kế hoạch audit ISO 17025": "Gantt chart for ISO 17025 audit plan",
  "Theo mốc thời gian kế hoạch (Planning Start → End) của từng đầu việc, nhóm theo hạng mục":
    "By planned timeline (Start → End) of each task, grouped by category",
  "Đang triển khai": "In progress",
  "Quá hạn": "Overdue",
  "Chưa bắt đầu": "Not started",
  "Quản lý hạng mục & nhiệm vụ": "Manage categories & tasks",
  "+ Thêm hạng mục": "+ Add category",
  "Chi tiết đầu việc kế hoạch audit": "Audit plan task details",
  "⤓ Xuất Excel": "⤓ Export Excel",
  "Đầu việc": "Task",
  "Người phụ trách": "Assignee",
  "Bắt đầu KH": "Planned start",
  "Kết thúc KH": "Planned end",
  "Bắt đầu TT": "Actual start",
  "Kết thúc TT": "Actual end",
  "T.lượng (ngày)": "Duration (days)",
  "Trạng thái": "Status",
}

let _rev: Record<string, string> | null = null
function buildRev(): Record<string, string> {
  if (_rev) return _rev
  _rev = {}
  for (const k of Object.keys(VF_DICT)) _rev[VF_DICT[k]] = k
  return _rev
}

// Port 1:1 tu vfApplyI18n(lang) ban goc (dong 8190-8203): duyet text node trong <body>
// (bo qua script/style/textarea), so khop CHINH XAC sau khi trim() roi thay the, cong
// them dich placeholder cua input/textarea. Chi chay o client (dung DOM TreeWalker).
export function applyI18n(lang: "vi" | "en"): void {
  if (typeof document === "undefined") return
  const map = lang === "en" ? VF_DICT : buildRev()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)
  const nodes: Node[] = []
  let n: Node | null
  // eslint-disable-next-line no-cond-assign
  while ((n = walker.nextNode())) nodes.push(n)
  nodes.forEach((node) => {
    const p = node.parentElement
    if (!p) return
    if (p.closest("script,style,textarea")) return
    const txt = node.nodeValue || ""
    const trimmed = txt.trim()
    if (!trimmed) return
    if (Object.prototype.hasOwnProperty.call(map, trimmed)) {
      node.nodeValue = txt.replace(trimmed, map[trimmed])
    }
  })
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[placeholder],textarea[placeholder]").forEach((el) => {
    const t = el.getAttribute("placeholder")
    if (!t) return
    if (Object.prototype.hasOwnProperty.call(map, t)) el.setAttribute("placeholder", map[t])
  })
  document.documentElement.lang = lang
}
