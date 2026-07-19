export type CenterRow = {
  id: string
  name: string
  address: string | null
  manager: string | null
  phone: string | null
  notes: string | null
  // Derived from linked Projects (mirrors the original app's renderCenters()).
  projectCount: number
  activeProjectCount: number
  customerCount: number
  totalValue: number
}
