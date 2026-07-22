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

// ---- Test catalog ----
export type SaveTestCatalogInput = { id?: string; code?: string | null; name: string; standard?: string | null; sampleQty?: string | null; leadTime?: string | null; price?: number | null }

export async function saveTestCatalogItem(input: SaveTestCatalogInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = { code: input.code || null, name: input.name, standard: input.standard || null, sampleQty: input.sampleQty || null, leadTime: input.leadTime || null, price: input.price ?? null }
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

export type SavePersonnelRoutingInput = { id?: string; testCode?: string | null; testName: string; prepHours?: string | null; setupHours?: string | null; testHours?: string | null; reportHours?: string | null }

export async function savePersonnelRouting(input: SavePersonnelRoutingInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = { testCode: input.testCode || null, testName: input.testName, prepHours: input.prepHours || null, setupHours: input.setupHours || null, testHours: input.testHours || null, reportHours: input.reportHours || null }
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
export type SaveDepreciationAssetInput = { id?: string; assetName: string; assetGroup?: string | null; totalValue?: number | null; years?: number | null }

export async function saveDepreciationAsset(input: SaveDepreciationAssetInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = { assetName: input.assetName, assetGroup: input.assetGroup || null, totalValue: input.totalValue ?? null, years: input.years ?? null }
  if (input.id) await db.depreciationAsset.update({ where: { id: input.id }, data })
  else await db.depreciationAsset.create({ data })
  revalidatePath("/quote")
}

export async function deleteDepreciationAsset(id: string) {
  await requirePermission("delete")
  await db.depreciationAsset.delete({ where: { id } })
  revalidatePath("/quote")
}

export async function bulkDeleteDepreciationAssets(ids: string[]) {
  await requirePermission("delete")
  await db.depreciationAsset.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}

// ---- Variable costs ----
export type SaveVariableCostInput = { id?: string; costType: string; description?: string | null; amount?: number | null }

export async function saveVariableCost(input: SaveVariableCostInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = { costType: input.costType, description: input.description || null, amount: input.amount ?? null }
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
