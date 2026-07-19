import { getDashboardStats, getTaskStatusBreakdown, getSampleStatusBreakdown } from "@/features/dashboard/queries"
import { DashboardView } from "@/features/dashboard/components/DashboardView"

export default async function DashPage() {
  const [stats, taskBreakdown, sampleBreakdown] = await Promise.all([
    getDashboardStats(),
    getTaskStatusBreakdown(),
    getSampleStatusBreakdown(),
  ])
  return <DashboardView stats={stats} taskBreakdown={taskBreakdown} sampleBreakdown={sampleBreakdown} />
}
