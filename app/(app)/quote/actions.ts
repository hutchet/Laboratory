"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// ---------- Quote (báo giá) ----------
export async function createQuote(formData: FormData) {
  const title = String(formData.get("title") || "Báo giá mới")
  const customerId = String(formData.get("customerId") || "") || null
  const projectId = String(formData.get("projectId") || "") || null
  const code = String(formData.get("code") || "") || null
  const vatPercent = formData.get("vatPercent") ? Number(formData.get("vatPercent")) : 10
  const q = await db.quote.create({ data: { title, customerId, projectId, code, vatPercent, status: "Nháp", totalAmount: 0 } })
  revalidatePath("/quote")
  return q.id
}

export async function deleteQuote(id: string) {
  await db.quoteCatalogItem.deleteMany({ where: { quoteId: id } })
  await db.quote.delete({ where: { id } })
  revalidatePath("/quote")
}

export async function updateQuoteMeta(formData: FormData) {
  const id = String(formData.get("id") || "")
  if (!id) return
  await db.quote.update({
    where: { id },
    data: {
      title: String(formData.get("title") || ""),
      customerId: String(formData.get("customerId") || "") || null,
      projectId: String(formData.get("projectId") || "") || null,
      code: String(formData.get("code") || "") || null,
      quoteDate: formData.get("quoteDate") ? new Date(String(formData.get("quoteDate"))) : null,
      vatPercent: formData.get("vatPercent") ? Number(formData.get("vatPercent")) : 10,
      creator: String(formData.get("creator") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      status: String(formData.get("status") || "Nháp"),
    },
  })
  revalidatePath(`/quote/${id}`)
}

async function recalcTotal(quoteId: string) {
  const [items, quote] = await Promise.all([
    db.quoteCatalogItem.findMany({ where: { quoteId } }),
    db.quote.findUnique({ where: { id: quoteId } }),
  ])
  const sub = items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0)
  const vat = sub * ((quote?.vatPercent ?? 10) / 100)
  await db.quote.update({ where: { id: quoteId }, data: { totalAmount: sub + vat } })
}

export async function addQuoteItemFromCatalog(formData: FormData) {
  const quoteId = String(formData.get("quoteId") || "")
  const catalogId = String(formData.get("catalogId") || "")
  if (!quoteId || !catalogId) return
  const cat = await db.testCatalogItem.findUnique({ where: { id: catalogId } })
  if (!cat) return
  await db.quoteCatalogItem.create({ data: { quoteId, name: cat.name, standard: cat.standard, price: cat.price ?? 0, quantity: 1 } })
  await recalcTotal(quoteId)
  revalidatePath(`/quote/${quoteId}`)
}

export async function updateQuoteItemQty(formData: FormData) {
  const itemId = String(formData.get("itemId") || "")
  const quoteId = String(formData.get("quoteId") || "")
  const quantity = Number(formData.get("quantity") || 1) || 1
  if (!itemId) return
  await db.quoteCatalogItem.update({ where: { id: itemId }, data: { quantity } })
  await recalcTotal(quoteId)
  revalidatePath(`/quote/${quoteId}`)
}

export async function removeQuoteItem(formData: FormData) {
  const itemId = String(formData.get("itemId") || "")
  const quoteId = String(formData.get("quoteId") || "")
  if (!itemId) return
  await db.quoteCatalogItem.delete({ where: { id: itemId } })
  await recalcTotal(quoteId)
  revalidatePath(`/quote/${quoteId}`)
}

// ---------- Danh mục bài thử (quote-catalog) ----------
export async function saveTestCatalogItem(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    code: String(formData.get("code") || "") || null,
    name: String(formData.get("name") || ""),
    standard: String(formData.get("standard") || "") || null,
    sampleQty: String(formData.get("sampleQty") || "") || null,
    leadTime: String(formData.get("leadTime") || "") || null,
    price: formData.get("price") ? Number(formData.get("price")) : null,
  }
  if (id) await db.testCatalogItem.update({ where: { id }, data })
  else await db.testCatalogItem.create({ data })
  revalidatePath("/quote")
}

export async function deleteTestCatalogItems(ids: string[]) {
  await db.testCatalogItem.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}

// ---------- Đơn giá nhân sự (quote-personnel) ----------
export async function savePersonnelRateConfig(formData: FormData) {
  await db.personnelRateConfig.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      techRate: Number(formData.get("techRate") || 0),
      engRate: Number(formData.get("engRate") || 0),
      leadRate: Number(formData.get("leadRate") || 0),
      mgrRate: Number(formData.get("mgrRate") || 0),
      overheadPct: Number(formData.get("overheadPct") || 0),
    },
    update: {
      techRate: Number(formData.get("techRate") || 0),
      engRate: Number(formData.get("engRate") || 0),
      leadRate: Number(formData.get("leadRate") || 0),
      mgrRate: Number(formData.get("mgrRate") || 0),
      overheadPct: Number(formData.get("overheadPct") || 0),
    },
  })
  revalidatePath("/quote")
}

export async function savePersonnelRouting(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    testCode: String(formData.get("testCode") || "") || null,
    testName: String(formData.get("testName") || ""),
    prepHours: String(formData.get("prepHours") || "") || null,
    setupHours: String(formData.get("setupHours") || "") || null,
    testHours: String(formData.get("testHours") || "") || null,
    reportHours: String(formData.get("reportHours") || "") || null,
  }
  if (id) await db.personnelRouting.update({ where: { id }, data })
  else await db.personnelRouting.create({ data })
  revalidatePath("/quote")
}

export async function deletePersonnelRoutings(ids: string[]) {
  await db.personnelRouting.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}

// ---------- Khấu hao thiết bị (quote-depreciation) ----------
export async function saveDepreciationAsset(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    assetName: String(formData.get("assetName") || ""),
    assetGroup: String(formData.get("assetGroup") || "") || null,
    totalValue: formData.get("totalValue") ? Number(formData.get("totalValue")) : null,
    years: formData.get("years") ? Number(formData.get("years")) : null,
  }
  if (id) await db.depreciationAsset.update({ where: { id }, data })
  else await db.depreciationAsset.create({ data })
  revalidatePath("/quote")
}

export async function deleteDepreciationAssets(ids: string[]) {
  await db.depreciationAsset.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}

// ---------- Đơn giá thiết bị (quote-matrix) ----------
export async function updateEquipmentRate(formData: FormData) {
  const id = String(formData.get("id") || "")
  const hourlyRate = formData.get("hourlyRate") ? Number(formData.get("hourlyRate")) : null
  if (!id) return
  await db.equipment.update({ where: { id }, data: { hourlyRate } })
  revalidatePath("/quote")
}

// ---------- Chi phí biến đổi khác (quote-variable) ----------
export async function saveVariableCost(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    costType: String(formData.get("costType") || ""),
    description: String(formData.get("description") || "") || null,
    amount: formData.get("amount") ? Number(formData.get("amount")) : null,
  }
  if (id) await db.variableCost.update({ where: { id }, data })
  else await db.variableCost.create({ data })
  revalidatePath("/quote")
}

export async function deleteVariableCosts(ids: string[]) {
  await db.variableCost.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/quote")
}
