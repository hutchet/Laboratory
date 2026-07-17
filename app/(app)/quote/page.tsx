import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import QuoteOverviewClient from "./QuoteOverviewClient"
import QuoteCatalogClient from "./QuoteCatalogClient"
import QuoteMatrixClient from "./QuoteMatrixClient"
import QuotePersonnelClient from "./QuotePersonnelClient"
import QuoteDepreciationClient from "./QuoteDepreciationClient"
import QuoteVariableClient from "./QuoteVariableClient"

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const view = tab || "quote-overview"
  const session = await auth()
  const userId = session?.user?.id
  const canCreate = userId ? await can(userId, "quote", "create") : false
  const canDelete = userId ? await can(userId, "quote", "delete") : false

  if (view === "quote-catalog") {
    const items = await db.testCatalogItem.findMany({ orderBy: { name: "asc" } })
    return <QuoteCatalogClient items={items} />
  }

  if (view === "quote-matrix") {
    const centers = await db.center.findMany({ orderBy: { name: "asc" }, include: { equipment: { orderBy: { name: "asc" } } } })
    return <QuoteMatrixClient centers={centers.map((c) => ({ id: c.id, name: c.name, equipment: c.equipment.map((e) => ({ id: e.id, name: e.name, code: e.code, category: e.category, hourlyRate: e.hourlyRate })) }))} />
  }

  if (view === "quote-personnel") {
    const [rateConfig, routings] = await Promise.all([
      db.personnelRateConfig.upsert({ where: { id: "singleton" }, create: { id: "singleton" }, update: {} }),
      db.personnelRouting.findMany({ orderBy: { testName: "asc" } }),
    ])
    return <QuotePersonnelClient rateConfig={rateConfig} routings={routings} />
  }

  if (view === "quote-depreciation") {
    const items = await db.depreciationAsset.findMany({ orderBy: { assetName: "asc" } })
    return <QuoteDepreciationClient items={items} />
  }

  if (view === "quote-variable") {
    const items = await db.variableCost.findMany({ orderBy: { costType: "asc" } })
    return <QuoteVariableClient items={items} />
  }

  const [quotes, customers] = await Promise.all([
    db.quote.findMany({ orderBy: { createdAt: "desc" }, include: { customer: true, catalogItems: true } }),
    db.customer.findMany({ orderBy: { name: "asc" } }),
  ])
  const rows = quotes.map((q) => ({
    id: q.id,
    title: q.title,
    code: q.code,
    status: q.status,
    customerName: q.customer?.name ?? null,
    itemCount: q.catalogItems.length,
    totalAmount: q.totalAmount,
  }))
  return <QuoteOverviewClient quotes={rows} customers={customers} canCreate={canCreate} canDelete={canDelete} />
}
