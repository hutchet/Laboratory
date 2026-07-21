import { db } from "@/shared/lib/db"
import { auth } from "@/shared/lib/auth"
import { getUserRbacContext, getScopeFilter } from "@/shared/lib/rbac"
import type { PurchaseItemRow } from "./types"

export async function listPurchaseItems(): Promise<PurchaseItemRow[]> {
  const session = await auth()
  const ctx = session?.user?.id ? await getUserRbacContext(session.user.id) : null
  const scopeFilter = ctx ? getScopeFilter(ctx, "purchase") : {}
  return db.purchaseItem.findMany({ where: scopeFilter, orderBy: { id: "desc" } })
}
