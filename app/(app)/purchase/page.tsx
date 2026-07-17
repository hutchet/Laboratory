import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import PurchaseClient from "./PurchaseClient"

export default async function PurchasePage() {
  const items = await db.purchaseItem.findMany()
  const session = await auth()
  const userId = session?.user?.id
  const canManage = userId ? await can(userId, "purchase", "edit") : false
  return <PurchaseClient items={items} canManage={canManage} />
}
