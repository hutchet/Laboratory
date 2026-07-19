import { db } from "@/shared/lib/db"
import type { CalibrationRow, AuditTrailRow } from "./types"
import { calcCalStatus, QL_AUTO_KEYS } from "./types"

export async function listCalibrationRows(): Promise<CalibrationRow[]> {
  const rows = await db.equipment.findMany({
    where: { calLast: { not: null }, calInterval: { not: null } },
    select: { id: true, name: true, code: true, calLast: true, calInterval: true },
  })
  const calc = rows.map((e) => {
    const calLastIso = e.calLast!.toISOString()
    const { due, state, daysLeft } = calcCalStatus(calLastIso, e.calInterval!)
    return { id: e.id, name: e.name, code: e.code, calLast: calLastIso, calInterval: e.calInterval!, due, state, daysLeft }
  })
  return calc.sort((a, b) => a.daysLeft - b.daysLeft)
}

export async function listChecklistState(): Promise<Record<string, boolean>> {
  const rows = await db.qualityChecklistState.findMany()
  const out: Record<string, boolean> = {}
  for (const r of rows) out[r.key] = r.checked
  return out
}

// Ngu canh de tinh qlChecklistAutoState(key) - port 1:1 dieu kien tu ban goc (dong 5553):
// - cal: co it nhat 1 thiet bi VA toan bo thiet bi deu co calLast+calInterval
// - audit: auditLog.length>0
// - role: co it nhat 1 thanh vien admin VA it nhat 1 thanh vien khong phai admin
// - coc: co du lieu theo doi vong doi mau (xap xi bang Sample.receivedAt hoac
//   TestItem.actualStart, vi model TestPack cua ban rebuild nay chua co truong
//   receivedDate/sampleStatus nhu testPacks ban goc - ghi chu ro de khong ngo nhan
//   day la port chinh xac 100%).
export type QlAutoContext = {
  equipmentTotal: number
  equipmentWithCal: number
  auditLogCount: number
  hasAdminMember: boolean
  hasNonAdminMember: boolean
  hasCocSignal: boolean
}

export async function getQlAutoContext(): Promise<QlAutoContext> {
  const [equipmentTotal, equipmentWithCal, auditLogCount, members, sampleWithReceived, testItemWithStart] = await Promise.all([
    db.equipment.count(),
    db.equipment.count({ where: { calLast: { not: null }, calInterval: { not: null } } }),
    db.auditLog.count(),
    db.member.findMany({ select: { accessRole: true } }),
    db.sample.count({ where: { receivedAt: { not: null } } }),
    db.testItem.count({ where: { actualStart: { not: null } } }),
  ])
  return {
    equipmentTotal,
    equipmentWithCal,
    auditLogCount,
    hasAdminMember: members.some((m) => m.accessRole === "admin"),
    hasNonAdminMember: members.some((m) => m.accessRole && m.accessRole !== "admin"),
    hasCocSignal: sampleWithReceived > 0 || testItemWithStart > 0,
  }
}

export function qlAutoState(key: string, ctx: QlAutoContext): boolean | null {
  if (!(QL_AUTO_KEYS as readonly string[]).includes(key)) return null
  if (key === "cal") return ctx.equipmentTotal > 0 && ctx.equipmentWithCal === ctx.equipmentTotal
  if (key === "audit") return ctx.auditLogCount > 0
  if (key === "role") return ctx.hasAdminMember && ctx.hasNonAdminMember
  if (key === "coc") return ctx.hasCocSignal
  return null
}

export async function listAuditTrail(): Promise<AuditTrailRow[]> {
  const rows = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  })
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    userName: r.userName,
    role: r.role,
    entity: r.entity,
    action: r.action,
    detail: r.detail,
    target: r.target,
  }))
}
