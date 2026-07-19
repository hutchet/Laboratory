export type Option = { id: string; name: string }

export type QuoteRow = {
  id: string
  title: string
  code: string | null
  quoteDate: string | null
  vatPercent: number | null
  status: string | null
  totalAmount: number | null
  customerId: string | null
  projectId: string | null
  customer: { id: string; name: string } | null
  project: { id: string; name: string } | null
}

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  draft: "Bản nháp",
  sent: "Đã gửi",
  approved: "Đã duyệt",
  rejected: "Bị từ chối",
}

export type TestCatalogRow = {
  id: string
  code: string | null
  name: string
  standard: string | null
  sampleQty: string | null
  leadTime: string | null
  price: number | null
}

export type PersonnelRateConfigRow = {
  id: string
  techRate: number
  engRate: number
  leadRate: number
  mgrRate: number
  overheadPct: number
}

export type PersonnelRoutingRow = {
  id: string
  testCode: string | null
  testName: string
  prepHours: string | null
  setupHours: string | null
  testHours: string | null
  reportHours: string | null
}

export type DepreciationAssetRow = {
  id: string
  assetName: string
  assetGroup: string | null
  totalValue: number | null
  years: number | null
}

export type VariableCostRow = {
  id: string
  costType: string
  description: string | null
  amount: number | null
}
