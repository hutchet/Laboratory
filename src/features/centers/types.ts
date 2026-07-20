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
