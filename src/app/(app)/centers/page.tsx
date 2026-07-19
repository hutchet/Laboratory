import { listCenters } from "@/features/centers/queries"
import { CentersView } from "@/features/centers/components/CentersView"

export default async function CentersPage() {
  const centers = await listCenters()
  return <CentersView centers={centers} />
}
