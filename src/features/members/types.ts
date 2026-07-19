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
}

export const ACCESS_ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị",
  manager: "Quản lý",
  technician: "Kỹ thuật viên",
  quote_staff: "Nhân viên báo giá",
  viewer: "Chỉ xem",
}
