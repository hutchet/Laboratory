import { listAuditPlans, listAuditPhases, listAuditItems } from "@/features/auditplan/queries"
import { AuditPlanView } from "@/features/auditplan/components/AuditPlanView"

export default async function AuditPlanPage() {
  const [plans, phases, items] = await Promise.all([listAuditPlans(), listAuditPhases(), listAuditItems()])
  return <AuditPlanView plans={plans} phases={phases} items={items} />
}
