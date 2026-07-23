import { db } from "@/shared/lib/db"
import crypto from "crypto"
import type {
  QuoteRow, TestCatalogRow, PersonnelRateConfigRow, PersonnelRoutingRow,
  DepreciationAssetRow, VariableCostRow, Option,
} from "./types"

export async function listQuotes(): Promise<QuoteRow[]> {
  const rows = await db.quote.findMany({ include: { customer: true, project: true, catalogItems: true }, orderBy: { createdAt: "desc" } })
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
    creator: q.creator,
    notes: q.notes,
    createdAt: q.createdAt.toISOString(),
    customer: q.customer ? { id: q.customer.id, name: q.customer.name } : null,
    project: q.project ? { id: q.project.id, name: q.project.name } : null,
    items: q.catalogItems.map((it) => ({ id: it.id, quoteId: it.quoteId, name: it.name, standard: it.standard, price: it.price, quantity: it.quantity })),
  }))
}

export async function listCustomerOptions(): Promise<Option[]> {
  return db.customer.findMany({ select: { id: true, name: true } })
}

export async function listProjectOptions(): Promise<Option[]> {
  return db.project.findMany({ select: { id: true, name: true } })
}

export async function listTestCatalog(): Promise<TestCatalogRow[]> {
  const [items, centers] = await Promise.all([
    db.testCatalogItem.findMany({ orderBy: { createdAt: "desc" } }),
    db.center.findMany({ select: { id: true, name: true } }),
  ])
  const centerMap = new Map(centers.map((c) => [c.id, c]))
  return items.map((it) => ({ ...it, center: it.centerId ? centerMap.get(it.centerId) ?? null : null }))
}

export async function getPersonnelRateConfig(): Promise<PersonnelRateConfigRow> {
  const existing = await db.personnelRateConfig.findUnique({ where: { id: "singleton" } })
  if (existing) return existing
  return db.personnelRateConfig.create({ data: { id: "singleton" } })
}

export async function listPersonnelRouting(): Promise<PersonnelRoutingRow[]> {
  const [items, centers] = await Promise.all([
    db.personnelRouting.findMany({ orderBy: { createdAt: "desc" } }),
    db.center.findMany({ select: { id: true, name: true } }),
  ])
  const centerMap = new Map(centers.map((c) => [c.id, c]))
  return items.map((it) => ({ ...it, center: it.centerId ? centerMap.get(it.centerId) ?? null : null }))
}

// y/c 116.1: Danh sach thiet bi nhap trong trang Thiet bi PHAI tu dong anh xa sang
// Khau hao thiet bi. Truoc khi tra ve, backfill 1 DepreciationAsset (equipmentId link)
// cho MOI Equipment con thieu (vd: thiet bi da co tu truoc khi tinh nang nay ra doi) -
// dam bao danh sach khau hao luon day du theo danh sach thiet bi, khong can nguoi
// dung tu tao tay. Sau do map kem thong tin center de nhom hub-card theo Trung tam.
export async function listDepreciationAssets(): Promise<DepreciationAssetRow[]> {
  // Backfill: tao DepreciationAsset cho Equipment nao chua co (raw SQL)
  const existingIds = (await db.$queryRawUnsafe<[{equipmentId: string}]>(
    `SELECT "equipmentId" FROM "DepreciationAsset"`,
  )).map((r: any) => r.equipmentId)
  const allEquipments = await db.equipment.findMany({ select: { id: true, name: true, centerId: true } })
  const missing = allEquipments.filter((e) => !existingIds.includes(e.id))
  for (const eq of missing) {
    await db.$executeRawUnsafe(
      `INSERT INTO "DepreciationAsset" ("id","assetName","centerId","equipmentId","createdAt") VALUES ($1,$2,$3,$4,now())`,
      crypto.randomUUID(), eq.name, eq.centerId, eq.id,
    )
  }

  const rows = await db.$queryRawUnsafe<any[]>(
    `SELECT d.id, d."assetName", d."assetGroup", d."totalValue", d."years", d."centerId", d."equipmentId",
            c.id as "c_id", c.name as "c_name"
     FROM "DepreciationAsset" d
     LEFT JOIN "Center" c ON c.id = d."centerId"
     ORDER BY d."createdAt" DESC`,
  )
  return rows.map((r) => ({
    id: r.id,
    assetName: r.assetName,
    assetGroup: r.assetGroup ?? null,
    totalValue: r.totalValue ?? null,
    years: r.years ?? null,
    centerId: r.centerId ?? null,
    equipmentId: r.equipmentId,
    center: r.c_id ? { id: r.c_id, name: r.c_name } : null,
  }))
}

export async function listVariableCosts(): Promise<VariableCostRow[]> {
  const [items, centers] = await Promise.all([
    db.variableCost.findMany({ orderBy: { createdAt: "desc" } }),
    db.center.findMany({ select: { id: true, name: true } }),
  ])
  const centerMap = new Map(centers.map((c) => [c.id, c]))
  return items.map((it) => ({ ...it, center: it.centerId ? centerMap.get(it.centerId) ?? null : null }))
}

export type EquipmentPricingRow = {
  id: string
  name: string
  code: string | null
  hourlyRate: number | null
  centerId: string | null
  center: { id: string; name: string; elecPrice: number | null; rentPrice: number | null } | null
}

export async function listEquipmentPricing(): Promise<EquipmentPricingRow[]> {
  const rows = await db.equipment.findMany({
    select: { id: true, name: true, code: true, hourlyRate: true, centerId: true, center: { select: { id: true, name: true, elecPrice: true, rentPrice: true } } },
    orderBy: { name: "asc" },
  })
  return rows.map((r) => ({ ...r, center: r.center ? { id: r.center.id, name: r.center.name, elecPrice: r.center.elecPrice, rentPrice: r.center.rentPrice } : null }))
}
