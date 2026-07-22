import { db } from "@/shared/lib/db"
import { auth } from "@/shared/lib/auth"
import { getUserRbacContext, getScopeFilter } from "@/shared/lib/rbac"
import type { AuditPlanRow, AuditPhaseRow, AuditItemRow } from "./types"

// "auditplan" la module cross-cutting cua Nhom van hanh (OPERATIONS_CROSS_CENTER_MODULES)
// nen Nhom van hanh xem duoc toan bo bat ke Trung tam/Nhom cua ho.
export async function listAuditPlans(): Promise<AuditPlanRow[]> {
  const session = await auth()
  const ctx = session?.user?.id ? await getUserRbacContext(session.user.id) : null
  const scopeFilter = ctx ? getScopeFilter(ctx, "auditplan") : {}
  const rows = await db.auditPlan.findMany({
    where: scopeFilter,
    include: { _count: { select: { items: true, phases: true } } },
    orderBy: { id: "desc" },
  })
  return rows.map((p) => ({
    id: p.id,
    title: p.title,
    scheduledAt: p.scheduledAt ? p.scheduledAt.toISOString() : null,
    status: p.status,
    itemCount: p._count.items,
    phaseCount: p._count.phases,
  }))
}

export async function listAuditPhases(): Promise<AuditPhaseRow[]> {
  return db.auditPhase.findMany({ orderBy: { order: "asc" } })
}

export async function listAuditItems(): Promise<AuditItemRow[]> {
  const rows = await db.auditItem.findMany({
    include: { phase: true, auditPlan: true },
    orderBy: { id: "desc" },
  })
  return rows.map((it) => ({
    id: it.id,
    auditPlanId: it.auditPlanId,
    phaseId: it.phaseId,
    name: it.name,
    assignee: it.assignee,
    status: it.status,
    planStart: it.planStart ? it.planStart.toISOString() : null,
    planEnd: it.planEnd ? it.planEnd.toISOString() : null,
    actualStart: it.actualStart ? it.actualStart.toISOString() : null,
    actualEnd: it.actualEnd ? it.actualEnd.toISOString() : null,
    note: it.note,
    createdAt: (it as any).createdAt.toISOString(),
    phase: it.phase ? { id: it.phase.id, name: it.phase.name, order: it.phase.order } : null,
    auditPlan: it.auditPlan ? { id: it.auditPlan.id, title: it.auditPlan.title } : null,
  }))
}
