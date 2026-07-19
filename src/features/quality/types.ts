// Port 1:1 tu QL_CHECKLIST_GROUPS + qlChecklistAutoState + calStatus trong ban goc
// (taskflow_original.html dong 5520-5560, 4434-4442).

export type ChecklistItemDef = { key: string; label: string }
export type ChecklistGroupDef = { clause: string; title: string; desc: string; items: ChecklistItemDef[] }

export const QL_CHECKLIST_GROUPS: ChecklistGroupDef[] = [
  {
    clause: "4", title: "Yêu cầu chung", desc: "Tính khách quan và bảo mật",
    items: [
      { key: "impartiality", label: "Có cam kết và chính sách về tính khách quan, không chịu áp lực thương mại/tài chính làm sai lệch kết quả" },
      { key: "confidentiality", label: "Có quy định bảo mật thông tin khách hàng và kết quả thử nghiệm" },
    ],
  },
  {
    clause: "5", title: "Yêu cầu về cơ cấu tổ chức", desc: "Tư cách pháp lý và trách nhiệm",
    items: [
      { key: "legal", label: "Xác định rõ tư cách pháp lý và cơ cấu tổ chức của phòng thử nghiệm" },
      { key: "responsibility", label: "Phân công trách nhiệm, quyền hạn rõ ràng cho từng vị trí" },
    ],
  },
  {
    clause: "6", title: "Yêu cầu về nguồn lực", desc: "Nhân sự, cơ sở vật chất, thiết bị",
    items: [
      { key: "personnel", label: "Nhân sự có năng lực phù hợp, được đào tạo và đánh giá định kỳ" },
      { key: "facility", label: "Cơ sở vật chất và điều kiện môi trường đáp ứng yêu cầu thử nghiệm" },
      { key: "cal", label: "Toàn bộ thiết bị đo kiểm có chứng nhận hiệu chuẩn còn hiệu lực" },
      { key: "external", label: "Kiểm soát chất lượng sản phẩm/dịch vụ do bên ngoài cung cấp (hiệu chuẩn thuê ngoài, nhà cung cấp...)" },
    ],
  },
  {
    clause: "7", title: "Yêu cầu về quá trình", desc: "Hợp đồng, phương pháp, mẫu, báo cáo",
    items: [
      { key: "contract", label: "Xem xét yêu cầu, đề nghị và hợp đồng trước khi thực hiện thử nghiệm" },
      { key: "sop", label: "Có quy trình vận hành chuẩn (SOP) cho từng phương pháp thử nghiệm" },
      { key: "coc", label: "Theo dõi được vòng đời mẫu (chain of custody) từ khi nhận đến khi trả/hủy" },
      { key: "uncertainty", label: "Đánh giá độ không đảm bảo đo cho các phép thử định lượng" },
      { key: "report", label: "Báo cáo kết quả đầy đủ, chính xác, có thể truy xuất nguồn gốc" },
      { key: "nonconform", label: "Có quy trình xử lý công việc không phù hợp và khiếu nại khách hàng" },
    ],
  },
  {
    clause: "8", title: "Yêu cầu hệ thống quản lý", desc: "Tài liệu, đánh giá nội bộ, cải tiến",
    items: [
      { key: "doccontrol", label: "Kiểm soát tài liệu nội bộ (SOP, biểu mẫu) có phiên bản và phê duyệt" },
      { key: "audit", label: "Có nhật ký truy vết (audit trail) cho mọi thay đổi dữ liệu thử nghiệm" },
      { key: "role", label: "Phân quyền rõ ràng theo vai trò trong hệ thống quản lý" },
      { key: "capa", label: "Có quy trình hành động khắc phục khi phát hiện sự không phù hợp" },
      { key: "internalaudit", label: "Thực hiện đánh giá nội bộ định kỳ theo kế hoạch" },
      { key: "mgmtreview", label: "Lãnh đạo thực hiện xem xét định kỳ hệ thống quản lý chất lượng" },
      { key: "backup", label: "Có cơ chế sao lưu/phục hồi dữ liệu định kỳ" },
    ],
  },
]

// Cac key co auto-state (tinh tu du lieu thuc, khong cho tick tay) - dung dung 4 key
// nhu qlChecklistAutoState ban goc: cal, audit, role, coc.
export const QL_AUTO_KEYS = ["cal", "audit", "role", "coc"] as const

export type CalibrationRow = {
  id: string
  name: string
  code: string | null
  calLast: string
  calInterval: number
  due: string
  state: "overdue" | "soon" | "ok"
  daysLeft: number
}

// Port 1:1 tu calStatus(e) ban goc (dong 4434): due = calLast + calInterval*30 ngay,
// qua han neu daysLeft<0, sap den han neu daysLeft<=30, con lai la ok.
export function calcCalStatus(calLast: string, calInterval: number): { due: string; state: "overdue" | "soon" | "ok"; daysLeft: number } {
  const lastDate = new Date(calLast)
  const due = new Date(lastDate.getTime())
  due.setDate(due.getDate() + calInterval * 30)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = new Date(due)
  dueDay.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((dueDay.getTime() - today.getTime()) / 86400000)
  const state = daysLeft < 0 ? "overdue" : daysLeft <= 30 ? "soon" : "ok"
  return { due: due.toISOString(), state, daysLeft }
}

export const QL_ENTITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Tất cả khu vực" },
  { value: "equipment", label: "Thiết bị" },
  { value: "sample", label: "Mẫu" },
  { value: "plan", label: "Kế hoạch/Bài test" },
  { value: "booking", label: "Đặt lịch" },
  { value: "member", label: "Thành viên" },
  { value: "project", label: "Dự án" },
]

export type AuditTrailRow = {
  id: string
  createdAt: string
  userName: string | null
  role: string | null
  entity: string | null
  action: string | null
  detail: string | null
  target: string | null
}
