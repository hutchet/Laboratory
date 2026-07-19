import { getDashboardRawData } from "@/features/dashboard/queries"
import { DashboardView } from "@/features/dashboard/components/DashboardView"

export default async function DashPage() {
  const data = await getDashboardRawData()
  return <DashboardView data={data} />
}
