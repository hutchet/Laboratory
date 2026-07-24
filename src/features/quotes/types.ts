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
  phong: string | null
  sampleQty: string | null
  leadTime: string | null
  price: number | null
  centerId: string | null
  center: { id: string; name: string } | null
  createdAt: string
  group1: string | null
  group2: string | null
  vts: string | null
  standardDays: number | null
  priceCatarcQc: number | null
  priceIdiadaChina: number | null
  priceIdiadaSpain: number | null
  priceMira: number | null
  priceCalspan: number | null
  priceImat: number | null
  estimatedHours: number | null
  machineHours: number | null
  personnelHours: number | null
  gapTiming: number | null
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
  centerId: string | null
  center: { id: string; name: string } | null
  createdAt: string
  group1: string | null
  group2: string | null
  phong: string | null
  vts: string | null
  standard: string | null
  prepTechHours: string | null
  prepEngHours: string | null
  prepLeadHours: string | null
  setupTechHours: string | null
  setupEngHours: string | null
  setupLeadHours: string | null
  testTechHours: string | null
  testEngHours: string | null
  testLeadHours: string | null
  reportTechHours: string | null
  reportEngHours: string | null
  reportLeadHours: string | null
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
  // Cac truong lay tu Equipment lien ket (chi hien thi, sua o trang Thiet bi)
  equipmentCode: string | null
  serialNumber: string | null
  depreciationMethod: string | null
  notes: string | null
  monthlyDepreciationSap: number | null
  costCenterCode: string | null
  gapCheck: number | null
  financeCheckStatus: string | null
}

export type VariableCostRow = {
  id: string
  costType: string
  description: string | null
  amount: number | null
  centerId: string | null
  center: { id: string; name: string } | null
  createdAt: string
}
