export type Option = { id: string; name: string }

export type QuoteCatalogItemRow = {
  id: string
  quoteId: string
  name: string
  standard: string | null
  price: number | null
  quantity: number | null
}

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
  creator: string | null
  notes: string | null
  createdAt: string
  customer: { id: string; name: string } | null
  project: { id: string; name: string } | null
  items: QuoteCatalogItemRow[]
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

// y/c 116.1: Tai san khau hao gio anh xa 1:1 tu Equipment (equipmentId) - assetName
// va center la "tu dong" theo thiet bi (chi hien thi, khong sua truc tiep o day),
// nguoi dung chi sua cac truong tai chinh con lai (assetGroup/totalValue/years).
export type DepreciationAssetRow = {
  id: string
  assetName: string
  assetGroup: string | null
  totalValue: number | null
  years: number | null
  centerId: string | null
  center: { id: string; name: string } | null
  equipmentId: string
}

export type VariableCostRow = {
  id: string
  costType: string
  description: string | null
  amount: number | null
}
