export type MemberRow = {
  id: string
  name: string
  code: string | null
  role: string | null
  gender: string | null
  team: string | null
  accessRole: string | null
  email: string | null
  phone: string | null
  // Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
  // Nhom van hanh. centerId/groupId quyet dinh pham vi du lieu duoc thay; isOperations
  // = true cho phep xem/thao tac cheo Trung tam voi cac module cross-cutting; allCenters
  // = true cho phep xem/thao tac TOAN BO Trung tam o MOI module (tuong duong Giam doc ve
  // pham vi du lieu, khong doi Phan quyen/cap bac).
  centerId: string | null
  groupId: string | null
  isOperations: boolean
  allCenters: boolean
  centerName: string | null
  groupName: string | null
}

// 6 cap bac moi + giu lai 5 ten vai tro cu (alias) de tuong thich Role/UserRole da co
// tren Neon truoc khi nang cap.
export const ACCESS_ROLE_LABEL: Record<string, string> = {
  // Additive — tách riêng "Admin" khỏi "Giám đốc" để hiển thị (yêu cầu: thêm 1 trường
  // admin riêng để hiển thị, tránh nhầm với Giám đốc). Về quyền hạn/phạm vi dữ liệu, admin
  // vẫn tương đương director (xem RANK_BY_ROLE trong rbac.ts) — đây CHỈ là đổi nhãn hiển
  // thị, không đổi cách phân quyền.
  admin: "Admin",
  director: "Giám đốc",
  dept_head: "Trưởng phòng",
  team_lead: "Trưởng nhóm",
  engineer: "Kỹ sư",
  technician: "Kỹ thuật viên",
  viewer: "Chỉ xem",
  // Alias voi ten vai tro cu (van con trong Role/UserRole tren Neon, xem rbac.ts)
  manager: "Trưởng phòng",
  quote_staff: "Nhân viên báo giá",
}

export const NEW_ACCESS_ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "director", label: "Giám đốc" },
  { value: "dept_head", label: "Trưởng phòng" },
  { value: "team_lead", label: "Trưởng nhóm" },
  { value: "engineer", label: "Kỹ sư" },
  { value: "technician", label: "Kỹ thuật viên" },
  { value: "quote_staff", label: "Nhân viên báo giá" },
  { value: "viewer", label: "Chỉ xem" },
]
