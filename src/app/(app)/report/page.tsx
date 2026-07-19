import { listReportProjects, listAllReportRows } from "@/features/report/queries"
import { ReportView } from "@/features/report/components/ReportView"

export default async function ReportPage() {
  const [projects, rowsByProject] = await Promise.all([listReportProjects(), listAllReportRows()])
  return <ReportView projects={projects} rowsByProject={rowsByProject} />
}
