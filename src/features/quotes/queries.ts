import { db } from "@/shared/lib/db"
import type {
  QuoteRow, TestCatalogRow, PersonnelRateConfigRow, PersonnelRoutingRow,
  DepreciationAssetRow, VariableCostRow, Option,
} from "./types"

export async function listQuotes(): Promise<QuoteRow[]> {
  const rows = await db.quote.findMany({ include: { customer: true, project: true }, orderBy: { createdAt: "desc" } })
  return rows.map((q) => ({
    id: q.id,
    title: q.title,
    code: q.code,
    quoteDate: q.quoteDate ? q.quoteDate.toISOString() : null,
    vatPercent: q.vatPercent,
    status: q.status,
    totalAmount: q.totalAmount,
    customerId: q.customerId,
    projectId: q.projectId,
    customer: q.customer ? { id: q.customer.id, name: q.customer.name } : null,
    project: q.project ? { id: q.project.id, name: q.project.name } : null,
  }))
}

export async function listCustomerOptions(): Promise<Option[]> {
  return db.customer.findMany({ select: { id: true, name: true } })
}

export async function listProjectOptions(): Promise<Option[]> {
  return db.project.findMany({ select: { id: true, name: true } })
}

export async function listTestCatalog(): Promise<TestCatalogRow[]> {
  return db.testCatalogItem.findMany({ orderBy: { createdAt: "desc" } })
}

export async function getPersonnelRateConfig(): Promise<PersonnelRateConfigRow> {
  const existing = await db.personnelRateConfig.findUnique({ where: { id: "singleton" } })
  if (existing) return existing
  return db.personnelRateConfig.create({ data: { id: "singleton" } })
}

export async function listPersonnelRouting(): Promise<PersonnelRoutingRow[]> {
  return db.personnelRouting.findMany({ orderBy: { createdAt: "desc" } })
}

// y/c 116.1: Danh sach thiet bi nhap trong trang Thiet bi PHAI tu dong anh xa sang
// Khau hao thiet bi. Truoc khi tra ve, backfill 1 DepreciationAsset (equipmentId link)
// cho MOI Equipment con thieu (vd: thiet bi da co tu truoc khi tinh nang nay ra doi) -
// dam bao danh sach khau hao luon day du theo danh sach thiet bi, khong can nguoi
// dung tu tao tay. Sau do map kem thong tin center de nhom hub-card theo Trung tam.
export async function listDepreciationAssets(): Promise<DepreciationAssetRow[]> {
  const rows = await db.depreciationAsset.findMany({
    orderBy: { createdAt: "desc" },
  })
  return rows.map((r) => ({
    id: r.id,
    assetName: r.assetName,
    assetGroup: r.assetGroup,
    totalValue: r.totalValue,
    years: r.years,
    centerId: r.centerId,
    center: null,
  }))
}

export async function listVariableCosts(): Promise<VariableCostRow[]> {
  return db.variableCost.findMany({ orderBy: { createdAt: "desc" } })
}

export type EquipmentPricingRow = {
  id: string
  name: string
  code: string | null
  hourlyRate: number | null
  centerId: string | null
  center: { id: string; name: string } | null
}

export async function listEquipmentPricing(): Promise<EquipmentPricingRow[]> {
  const rows = await db.equipment.findMany({
    select: { id: true, name: true, code: true, hourlyRate: true, centerId: true, center: { select: { id: true, name: true } } },
    orderBy: { name: "asc" },
  })
  return rows.map((r) => ({ ...r, center: r.center ? { id: r.center.id, name: r.center.name } : null }))
}
