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

export async function listDepreciationAssets(): Promise<DepreciationAssetRow[]> {
  return db.depreciationAsset.findMany({ orderBy: { createdAt: "desc" } })
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
