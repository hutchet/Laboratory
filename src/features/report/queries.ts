import { db } from "@/shared/lib/db"
import type { ReportProjectCard, ReportRowRecord } from "./types"

export async function listReportProjects(): Promise<ReportProjectCard[]> {
  const projects = await db.project.findMany({
    include: { _count: { select: { reportRows: true } } },
    orderBy: { createdAt: "desc" },
  })
  return projects.map((p) => ({ id: p.id, name: p.name, rowCount: p._count.reportRows, createdAt: p.createdAt.toISOString() }))
}

// Tra ve toan bo dong bao cao, gom nhom theo projectId, de truyen mot lan cho client
// component (giong bien `reports` global cua ban goc duoc load 1 lan tu localStorage).
export async function listAllReportRows(): Promise<Record<string, ReportRowRecord[]>> {
  const rows = await db.reportRow.findMany({ orderBy: { position: "asc" } })
  const map: Record<string, ReportRowRecord[]> = {}
  for (const r of rows) {
    if (!map[r.projectId]) map[r.projectId] = []
    map[r.projectId].push({
      id: r.id,
      position: r.position,
      testName: r.testName ?? "",
      standard: r.standard ?? "",
      steps: r.steps ?? "",
      criteria: r.criteria ?? "",
      equipment: r.equipment ?? "",
      calibration: r.calibration ?? "",
    })
  }
  return map
}
