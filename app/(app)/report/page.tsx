import { db } from "@/lib/db"
import ReportClient from "./ReportClient"

export const runtime = 'edge'

export default async function ReportPage() {
  const reports = await db.report.findMany({ include: { project: true }, orderBy: { createdAt: "desc" } })
  const projects = await db.project.findMany({ select: { id: true, name: true } })
  const rows = reports.map((r) => ({
    id: r.id, title: r.title, content: r.content, projectId: r.projectId,
    projectName: r.project?.name ?? null, createdAt: r.createdAt.toISOString(),
  }))
  return <ReportClient reports={rows} projects={projects} />
}
