import { listPurchaseItems } from "@/features/purchase/queries"
import { listMembers } from "@/features/members/queries"
import { listCenters } from "@/features/centers/queries"
import { PurchaseView } from "@/features/purchase/components/PurchaseView"

export default async function PurchasePage() {
  const [items, members, centers] = await Promise.all([
    listPurchaseItems(),
    listMembers(),
    listCenters(),
  ])
  return (
    <PurchaseView
      items={items}
      members={members.map((m) => ({ id: m.id, name: m.name, team: m.team }))}
      centers={centers.map((c) => ({ id: c.id, name: c.name }))}
    />
  )
}
