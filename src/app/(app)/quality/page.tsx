import { listCalibrationRows, listChecklistState, getQlAutoContext, qlAutoState, listAuditTrail } from "@/features/quality/queries"
import { QL_CHECKLIST_GROUPS } from "@/features/quality/types"
import { QualityView } from "@/features/quality/components/QualityView"

export default async function QualityPage() {
  const [calibration, checklistState, autoCtx, auditTrail] = await Promise.all([
    listCalibrationRows(),
    listChecklistState(),
    getQlAutoContext(),
    listAuditTrail(),
  ])

  const autoState: Record<string, boolean> = {}
  for (const g of QL_CHECKLIST_GROUPS) {
    for (const it of g.items) {
      const v = qlAutoState(it.key, autoCtx)
      if (v !== null) autoState[it.key] = v
    }
  }

  return (
    <QualityView
      calibration={calibration}
      checklistState={checklistState}
      autoState={autoState}
      auditTrail={auditTrail}
      auditLogCount={autoCtx.auditLogCount}
    />
  )
}
