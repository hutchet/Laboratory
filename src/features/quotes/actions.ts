"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "quote", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

// ---- Quote header ----
export type SaveQuoteInput = {
  id?: string
  title: string
  code?: string | null
  quoteDate?: string | null
  vatPercent?: number | null
  status?: string | null
  totalAmount?: number | null
  customerId?: string | null
  projectId?: string | null
  creator?: string | null
  notes?: string | null
}

export async function saveQuote(input: SaveQuoteInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    title: input.title,
    code: input.code || null,
    quoteDate: input.quoteDate ? new Date(input.quoteDate) : null,
    vatPercent: input.vatPercent ?? 10,
    status: input.status || "draft",
    totalAmount: input.totalAmount ?? null,
    customerId: input.customerId || null,
    projectId: input.projectId || null,
    creator: input.creator || null,
    notes: input.notes || null,
  }
  if (input.id) {
    await db.quote.update({ where: { id: input.id }, data })
  } else {
    await db.quote.create({ data })
    await logAudit("quote", "create", data.title, `Thêm báo giá “${data.title}”`)
  }
  revalidatePath("/quote")
}

export async function deleteQuote(id: string) {
  await requirePermission("delete")
  const existing = await db.quote.findUnique({ where: { id } })
  await db.quote.delete({ where: { id } })
  await logAudit("quote", "delete", existing?.title || id, `Xoá báo giá “${existing?.title || id}”`)
  revalidatePath("/quote")
}

export async function bulkDeleteQuotes(ids: string[]) {
  await requirePermission("delete")
  await db.quote.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}

// ---- Quote line items (Hạng mục báo giá) ----
// Ported from ql-add-catalog / ql-items-body in the original: user picks a
// catalog test to copy into the quote as a priced line item, then can adjust
// quantity or remove it. Values are snapshotted onto QuoteCatalogItem so a
// later edit to the master catalog price does not retroactively change an
// already-issued quote.
export type AddQuoteItemInput = { quoteId: string; name: string; standard?: string | null; price?: number | null; quantity?: number | null; code?: string | null; sampleQty?: string | null; leadTime?: string | null }

export async function addQuoteItem(input: AddQuoteItemInput) {
  await requirePermission("edit")
  await db.quoteCatalogItem.create({
    data: { quoteId: input.quoteId, name: input.name, standard: input.standard || null, price: input.price ?? null, quantity: input.quantity ?? 1, code: input.code || null, sampleQty: input.sampleQty || null, leadTime: input.leadTime || null },
  })
  revalidatePath("/quote")
}

export async function updateQuoteItemQty(id: string, quantity: number) {
  await requirePermission("edit")
  await db.quoteCatalogItem.update({ where: { id }, data: { quantity: Math.max(1, Math.round(quantity) || 1) } })
  revalidatePath("/quote")
}

export async function removeQuoteItem(id: string) {
  await requirePermission("edit")
  await db.quoteCatalogItem.delete({ where: { id } })
  revalidatePath("/quote")
}

// ---- Test catalog ----
export type SaveTestCatalogInput = {
  id?: string; code?: string | null; name: string; standard?: string | null; phong?: string | null; sampleQty?: string | null; leadTime?: string | null; price?: number | null; centerId?: string | null
  group1?: string | null; group2?: string | null; vts?: string | null; standardDays?: number | null
  priceCatarcQc?: number | null; priceIdiadaChina?: number | null; priceIdiadaSpain?: number | null
  priceMira?: number | null; priceCalspan?: number | null; priceImat?: number | null
  estimatedHours?: number | null; machineHours?: number | null; personnelHours?: number | null; gapTiming?: number | null
}

export async function saveTestCatalogItem(input: SaveTestCatalogInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    code: input.code || null, name: input.name, standard: input.standard || null, phong: input.phong || null, sampleQty: input.sampleQty || null, leadTime: input.leadTime || null, price: input.price ?? null, centerId: input.centerId || null,
    group1: input.group1 || null, group2: input.group2 || null, vts: input.vts || null, standardDays: input.standardDays ?? null,
    priceCatarcQc: input.priceCatarcQc ?? null, priceIdiadaChina: input.priceIdiadaChina ?? null, priceIdiadaSpain: input.priceIdiadaSpain ?? null,
    priceMira: input.priceMira ?? null, priceCalspan: input.priceCalspan ?? null, priceImat: input.priceImat ?? null,
    estimatedHours: input.estimatedHours ?? null, machineHours: input.machineHours ?? null, personnelHours: input.personnelHours ?? null, gapTiming: input.gapTiming ?? null,
  }
  if (input.id) await db.testCatalogItem.update({ where: { id: input.id }, data })
  else await db.testCatalogItem.create({ data })
  revalidatePath("/quote")
}

export async function deleteTestCatalogItem(id: string) {
  await requirePermission("delete")
  await db.testCatalogItem.delete({ where: { id } })
  revalidatePath("/quote")
}

export async function bulkDeleteTestCatalogItems(ids: string[]) {
  await requirePermission("delete")
  await db.testCatalogItem.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}

// ---- Personnel rate config (singleton) ----
export type SavePersonnelRateConfigInput = { techRate: number; engRate: number; leadRate: number; mgrRate: number; overheadPct: number }

export async function savePersonnelRateConfig(input: SavePersonnelRateConfigInput) {
  await requirePermission("edit")
  await db.personnelRateConfig.upsert({
    where: { id: "singleton" },
    update: input,
    create: { id: "singleton", ...input },
  })
  revalidatePath("/quote")
}

export type SavePersonnelRoutingInput = {
  id?: string; testCode?: string | null; testName: string; prepHours?: string | null; setupHours?: string | null; testHours?: string | null; reportHours?: string | null; centerId?: string | null
  group1?: string | null; group2?: string | null; phong?: string | null; vts?: string | null; standard?: string | null
  prepTechHours?: string | null; prepEngHours?: string | null; prepLeadHours?: string | null
  setupTechHours?: string | null; setupEngHours?: string | null; setupLeadHours?: string | null
  testTechHours?: string | null; testEngHours?: string | null; testLeadHours?: string | null
  reportTechHours?: string | null; reportEngHours?: string | null; reportLeadHours?: string | null
}

export async function savePersonnelRouting(input: SavePersonnelRoutingInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    testCode: input.testCode || null, testName: input.testName, prepHours: input.prepHours || null, setupHours: input.setupHours || null, testHours: input.testHours || null, reportHours: input.reportHours || null, centerId: input.centerId || null,
    group1: input.group1 || null, group2: input.group2 || null, phong: input.phong || null, vts: input.vts || null, standard: input.standard || null,
    prepTechHours: input.prepTechHours || null, prepEngHours: input.prepEngHours || null, prepLeadHours: input.prepLeadHours || null,
    setupTechHours: input.setupTechHours || null, setupEngHours: input.setupEngHours || null, setupLeadHours: input.setupLeadHours || null,
    testTechHours: input.testTechHours || null, testEngHours: input.testEngHours || null, testLeadHours: input.testLeadHours || null,
    reportTechHours: input.reportTechHours || null, reportEngHours: input.reportEngHours || null, reportLeadHours: input.reportLeadHours || null,
  }
  if (input.id) await db.personnelRouting.update({ where: { id: input.id }, data })
  else await db.personnelRouting.create({ data })
  revalidatePath("/quote")
}

export async function deletePersonnelRouting(id: string) {
  await requirePermission("delete")
  await db.personnelRouting.delete({ where: { id } })
  revalidatePath("/quote")
}

export async function bulkDeletePersonnelRouting(ids: string[]) {
  await requirePermission("delete")
  await db.personnelRouting.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}

// ---- Depreciation assets ----
// y/c 116.1: Tai san khau hao gio LUON gan 1:1 voi 1 Equipment (duoc tu dong tao/
// backfill trong listDepreciationAssets()) - khong con tao/xoa tay tu trang nay nua.
// saveDepreciationAsset() chi con sua CAC TRUONG TAI CHINH CON LAI (Nhom tai san,
// Tong gia tri, So nam KH); assetName luon lay theo ten thiet bi da tao, id la BAT
// BUOC (bat buoc phai la 1 dong da anh xa tu thiet bi).
export type SaveDepreciationAssetInput = { id: string; assetGroup?: string | null; totalValue?: number | null; years?: number | null }

export async function saveDepreciationAsset(input: SaveDepreciationAssetInput) {
  await requirePermission("edit")
  const data = { assetGroup: input.assetGroup || null, totalValue: input.totalValue ?? null, years: input.years ?? null }
  await db.depreciationAsset.update({ where: { id: input.id }, data })
  revalidatePath("/quote")
}

// ---- Variable costs ----
export type SaveVariableCostInput = { id?: string; costType: string; description?: string | null; amount?: number | null; centerId?: string | null }

export async function saveVariableCost(input: SaveVariableCostInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = { costType: input.costType, description: input.description || null, amount: input.amount ?? null, centerId: input.centerId || null }
  if (input.id) await db.variableCost.update({ where: { id: input.id }, data })
  else await db.variableCost.create({ data })
  revalidatePath("/quote")
}

export async function deleteVariableCost(id: string) {
  await requirePermission("delete")
  await db.variableCost.delete({ where: { id } })
  revalidatePath("/quote")
}

export async function bulkDeleteVariableCosts(ids: string[]) {
  await requirePermission("delete")
  await db.variableCost.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}

// ---- Equipment pricing (Đơn giá thiết bị) ----
export async function updateEquipmentRate(id: string, hourlyRate: number | null) {
  await requirePermission("edit")
  await db.equipment.update({ where: { id }, data: { hourlyRate } })
  revalidatePath("/quote")
  revalidatePath("/equipment")
}

// ---- Xuat Excel Bao gia (item6, 10:03PM: dung file excel mau lam template) ----
export async function exportQuoteOverviewExcel(quoteId: string): Promise<{ base64: string; filename: string }> {
  const { buildQuoteOverviewWorkbook } = await import("./lib/quoteExcelTemplate")
  const q = await db.quote.findUnique({ where: { id: quoteId }, include: { customer: true, project: true, catalogItems: true } })
  if (!q) throw new Error("Không tìm thấy báo giá")
  const row = {
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
    items: q.catalogItems.map((it) => ({ id: it.id, quoteId: it.quoteId, name: it.name, standard: it.standard, price: it.price, quantity: it.quantity, code: it.code ?? null, sampleQty: it.sampleQty ?? null, leadTime: it.leadTime ?? null })),
  }
  const buffer = buildQuoteOverviewWorkbook(row)
  const safeCode = (q.code || q.title || "bao-gia").replace(/[^a-zA-Z0-9_\-]+/g, "_")
  return { base64: buffer.toString("base64"), filename: `BaoGia_${safeCode}.xlsx` }
}
