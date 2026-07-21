export type CenterRow = {
  id: string
  name: string
  address: string | null
  manager: string | null
  phone: string | null
  notes: string | null
  // Giá điện (đ/kWh) và giá thuê nhà xưởng (đ/m²/giờ) dùng để tính chi phí
  // điện/nhà xưởng trong Quote Matrix (ported từ qtMachineElec/qtMachineNX).
  elecPrice: number | null
  rentPrice: number | null
  // Derived from linked Projects (mirrors the original app's renderCenters()).
  projectCount: number
  activeProjectCount: number
  customerCount: number
  totalValue: number
}

// Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
// Nhom van hanh (Section 3 va 12): moi Trung tam co the co nhieu Nhom van hanh,
// moi Nhom co 1 Truong nhom (teamLeadId, tro toi Member) va so thanh vien.
export type GroupRow = {
  id: string
  name: string
  centerId: string
  centerName: string | null
  teamLeadId: string | null
  teamLeadName: string | null
  memberCount: number
}

// Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
// Nhom van hanh (Section 11): cap quyen xem (read-only) them Trung tam ngoai pham vi
// mac dinh cho tai khoan "Chi xem" (viewer). userId tro toi User (tai khoan dang nhap),
// hien thi kem ten thanh vien (Member cung email) cho de doc.
export type ViewerAccessGrant = {
  id: string
  userId: string
  centerId: string
  centerName: string | null
  viewerName: string
  viewerEmail: string | null
}

export type ViewerCandidate = {
  userId: string
  name: string
  email: string
}
