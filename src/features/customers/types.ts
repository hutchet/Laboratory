export type CustomerRow = {
  id: string
  name: string
  createdAt: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  value: number | null
  notes: string | null
  // Derived from linked Projects/Tasks (mirrors the original app's renderCustomers()).
  projectCount: number
  activeProjectCount: number
  displayValue: number
}
