import { db } from "@/lib/db"
import PlanClient from "./PlanClient"

export const runtime = 'edge'

export default async function PlanPage() {
  const plans = await db.testPlan.findMany({ include: { project: true, items: { include: { sample: true, equipment: true } } } })
  const projects = await db.project.findMany({ select: { id: true, name: true } })
  const samples = await db.sample.findMany({ select: { id: true, name: true } })
  const equipment = await db.equipment.findMany({ select: { id: true, name: true } })

  const rows = plans.map((p) => ({
    id: p.id,
    title: p.title,
    projectId: p.projectId,
    projectName: p.project.name,
    items: p.items.map((i) => ({
      id: i.id, sampleId: i.sampleId, sampleName: i.sample?.name ?? null, reportCode: i.reportCode,
      equipmentId: i.equipmentId, equipmentName: i.equipment?.name ?? null,
      name: i.name, priority: i.priority, standard: i.standard,
      assignee: i.assignee, planStart: i.planStart ? i.planStart.toISOString() : null, planEnd: i.planEnd ? i.planEnd.toISOString() : null,
      actualStart: i.actualStart ? i.actualStart.toISOString() : null, actualEnd: i.actualEnd ? i.actualEnd.toISOString() : null,
      result: i.result, progress: i.progress, note: i.note,
    })),
  }))

  return <PlanClient plans={rows} projects={projects} samples={samples} equipment={equipment} />
}
