import { db } from "@/lib/db"
import AuditPlanClient from "./AuditPlanClient"

export const runtime = 'edge'

export default async function AuditPlanPage() {
  const plans = await db.auditPlan.findMany({ include: { phases: true, items: true } })
  const rows = plans.map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    phases: p.phases.map((ph) => ({ id: ph.id, name: ph.name })),
    items: p.items.map((i) => ({
      id: i.id, name: i.name, phaseId: i.phaseId, assignee: i.assignee,
      planStart: i.planStart ? i.planStart.toISOString() : null,
      planEnd: i.planEnd ? i.planEnd.toISOString() : null,
      actualStart: i.actualStart ? i.actualStart.toISOString() : null,
      actualEnd: i.actualEnd ? i.actualEnd.toISOString() : null,
      status: i.status,
      note: i.note,
    })),
  }))
  return <AuditPlanClient plans={rows} />
}
