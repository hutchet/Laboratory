import { db } from "@/shared/lib/db"
import type { PurchaseItemRow } from "./types"

export async function listPurchaseItems(): Promise<PurchaseItemRow[]> {
  return db.purchaseItem.findMany({ orderBy: { id: "desc" } })
}
