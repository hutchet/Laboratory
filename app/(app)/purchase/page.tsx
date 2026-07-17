import { db } from "@/lib/db"
import PurchaseClient from "./PurchaseClient"

export default async function PurchasePage() {
  const items = await db.purchaseItem.findMany()
  return <PurchaseClient items={items} />
}
