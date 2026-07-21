"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can, getUserRbacContext, assertScopedAccess } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"
import { AP_SEED_DATA } from "./seed-data"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "auditplan", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
  return userId
}

export type SaveAuditPlanInput = { id?: string; title: string; scheduledAt?: string | null; status?: string | null }

export async function saveAuditPlan(input: SaveAuditPlanInput) {
  const userId = await requirePermission(input.id ? "edit" : "create")
  const data: Record<string, unknown> = { title: input.title, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null, status: input.status || "planned" }
  if (input.id) {
    const existing = await db.auditPlan.findUnique({ where: { id: input.id } })
    const ctx = await getUserRbacContext(userId)
    assertScopedAccess(ctx, "auditplan", existing)
    await db.auditPlan.update({ where: { id: input.id }, data })
  } else {
    const ctx = await getUserRbacContext(userId)
    data.centerId = ctx.centerId ?? null
    data.groupId = ctx.groupId ?? null
    const created = await db.auditPlan.create({ data: data as Parameters<typeof db.auditPlan.create>[0]["data"] })
    await logAudit("auditplan", "create", created.title, `Thêm kế hoạch kiểm toán “${created.title}”`)
  }
  revalidatePath("/auditplan")
}

export async function deleteAuditPlan(id: string) {
  const userId = await requirePermission("delete")
  const existing = await db.auditPlan.findUnique({ where: { id } })
  const ctx = await getUserRbacContext(userId)
  assertScopedAccess(ctx, "auditplan", existing)
  await db.auditPlan.delete({ where: { id } })
  revalidatePath("/auditplan")
}

export type SaveAuditPhaseInput = { id?: string; auditPlanId: string; name: string; order?: number | null }

async function assertAuditPlanScope(userId: string, auditPlanId: string) {
  const plan = await db.auditPlan.findUnique({ where: { id: auditPlanId } })
  const ctx = await getUserRbacContext(userId)
  assertScopedAccess(ctx, "auditplan", plan)
}

export async function saveAuditPhase(input: SaveAuditPhaseInput) {
  const userId = await requirePermission(input.id ? "edit" : "create")
  await assertAuditPlanScope(userId, input.auditPlanId)
  const data = { auditPlanId: input.auditPlanId, name: input.name, order: input.order ?? null }
  if (input.id) await db.auditPhase.update({ where: { id: input.id }, data: { name: data.name, order: data.order } })
  else await db.auditPhase.create({ data })
  revalidatePath("/auditplan")
}

export async function deleteAuditPhase(id: string) {
  const userId = await requirePermission("delete")
  const phase = await db.auditPhase.findUnique({ where: { id } })
  if (phase) await assertAuditPlanScope(userId, phase.auditPlanId)
  await db.auditPhase.delete({ where: { id } })
  revalidatePath("/auditplan")
}

export type SaveAuditItemInput = {
  id?: string
  auditPlanId: string
  phaseId?: string | null
  name: string
  assignee?: string | null
  status?: string | null
  planStart?: string | null
  planEnd?: string | null
  actualStart?: string | null
  actualEnd?: string | null
  note?: string | null
}

export async function saveAuditItem(input: SaveAuditItemInput) {
  const userId = await requirePermission(input.id ? "edit" : "create")
  await assertAuditPlanScope(userId, input.auditPlanId)
  const data = {
    auditPlanId: input.auditPlanId,
    phaseId: input.phaseId || null,
    name: input.name,
    assignee: input.assignee || null,
    status: input.status || "planned",
    planStart: input.planStart ? new Date(input.planStart) : null,
    planEnd: input.planEnd ? new Date(input.planEnd) : null,
    actualStart: input.actualStart ? new Date(input.actualStart) : null,
    actualEnd: input.actualEnd ? new Date(input.actualEnd) : null,
    note: input.note || null,
  }
  if (input.id) await db.auditItem.update({ where: { id: input.id }, data })
  else await db.auditItem.create({ data })
  revalidatePath("/auditplan")
}

export async function deleteAuditItem(id: string) {
  const userId = await requirePermission("delete")
  const item = await db.auditItem.findUnique({ where: { id } })
  if (item) await assertAuditPlanScope(userId, item.auditPlanId)
  await db.auditItem.delete({ where: { id } })
  revalidatePath("/auditplan")
}

/**
 * Seeds a brand-new AuditPlan with the original app's ISO 17025 accreditation
 * roadmap (AP_SEED_DATA: 16 phase groups, ~50 tasks with real plan/actual dates
 * and PIC). Faithful port of the original's default seeded plan
 * ({id:'iso17025', name:'Kế hoạch audit ISO 17025', phases: AP_SEED_DATA}).
 */
export async function seedIso17025Plan() {
  await requirePermission("create")
  const plan = await db.auditPlan.create({
    data: { title: "Kế hoạch audit ISO 17025", status: "planned" },
  })
  for (const group of AP_SEED_DATA) {
    const phase = await db.auditPhase.create({
      data: { auditPlanId: plan.id, name: `${group.no}. ${group.title}`, order: Number(group.no.split(".")[0]) || 0 },
    })
    for (const t of group.tasks) {
      await db.auditItem.create({
        data: {
          auditPlanId: plan.id,
          phaseId: phase.id,
          name: t.name,
          assignee: t.pic || null,
          status: t.aend ? "done" : "planned",
          planStart: t.start ? new Date(t.start) : null,
          planEnd: t.end ? new Date(t.end) : null,
          actualStart: t.astart ? new Date(t.astart) : null,
          actualEnd: t.aend ? new Date(t.aend) : null,
          note: [t.desc, t.note].filter(Boolean).join(" — ") || null,
        },
      })
    }
  }
  await logAudit("auditplan", "create", plan.title, "Tạo kế hoạch từ mẫu ISO 17025 (dữ liệu gốc)")
  revalidatePath("/auditplan")
  return plan.id
}
