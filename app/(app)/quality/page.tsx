import { db } from "@/lib/db"
import QualityClient from "./QualityClient"

export const runtime = 'edge'

export default async function QualityPage() {
  const checklist = await db.qualityChecklistItem.findMany({ orderBy: { id: "asc" } })
  const equipment = await db.equipment.findMany()
  const auditEntries = await db.qualityAuditEntry.findMany({ orderBy: { createdAt: "desc" }, take: 100 })
  const now = new Date()

  const calibration = equipment.filter((e) => e.calLast && e.calInterval).map((e) => {
    const due = new Date(e.calLast as Date)
    due.setMonth(due.getMonth() + (e.calInterval as number))
    let dueLabel = "ok"
    if (due < now) dueLabel = "overdue"
    else if (due.getTime() - now.getTime() <= 30 * 86400000) dueLabel = "soon"
    return { id: e.id, name: e.name, code: e.code, calLast: e.calLast ? (e.calLast as Date).toISOString() : null, calInterval: e.calInterval, calVendor: e.calVendor, calCert: e.calCert, dueLabel, dueDate: due.toISOString() }
  })

  return (
    <QualityClient
      checklist={checklist.map((c) => ({ id: c.id, name: c.name, done: c.done, dueDate: c.dueDate ? c.dueDate.toISOString() : null }))}
      calibration={calibration}
      auditEntries={auditEntries.map((a) => ({ id: a.id, entity: a.entity, actor: a.actor, role: null, area: a.entity, action: a.action, note: a.note, createdAt: a.createdAt.toISOString() }))}
    />
  )
}
