import { db } from "@/shared/lib/db"
import type { TestItemRow, TestPackRow, TestPlanRow, Option } from "./types"

export async function listTestItems(): Promise<TestItemRow[]> {
  const rows = await db.testItem.findMany({
    include: { sample: true, equipment: true, pic: true, testPlan: { include: { project: true } } },
    orderBy: { createdAt: "desc" },
  })
  return rows.map((t) => ({
    id: t.id,
    testPlanId: t.testPlanId,
    packId: t.packId,
    name: t.name,
    reportCode: t.reportCode,
    priority: t.priority,
    standard: t.standard,
    assignee: t.assignee,
    picId: t.picId,
    result: t.result,
    progress: t.progress,
    note: t.note,
    sampleId: t.sampleId,
    equipmentId: t.equipmentId,
    planStart: t.planStart ? t.planStart.toISOString() : null,
    planEnd: t.planEnd ? t.planEnd.toISOString() : null,
    actualStart: t.actualStart ? t.actualStart.toISOString() : null,
    actualEnd: t.actualEnd ? t.actualEnd.toISOString() : null,
    sample: t.sample ? { id: t.sample.id, name: t.sample.name } : null,
    equipment: t.equipment ? { id: t.equipment.id, name: t.equipment.name } : null,
    pic: t.pic ? { id: t.pic.id, name: t.pic.name } : null,
    testPlan: t.testPlan ? { id: t.testPlan.id, title: t.testPlan.title, project: t.testPlan.project ? { id: t.testPlan.project.id, name: t.testPlan.project.name } : null } : null,
  }))
}

export async function listTestPacks(): Promise<TestPackRow[]> {
  const rows = await db.testPack.findMany({ orderBy: { code: "asc" } })
  return rows.map((p) => ({ id: p.id, testPlanId: p.testPlanId, code: p.code, serial: p.serial, qty: p.qty }))
}

export async function listTestPlans(): Promise<TestPlanRow[]> {
  const rows = await db.testPlan.findMany({ include: { project: true } })
  return rows.map((p) => ({ id: p.id, projectId: p.projectId, title: p.title, project: p.project ? { id: p.project.id, name: p.project.name } : null }))
}

export async function listProjectOptions(): Promise<Option[]> {
  return db.project.findMany({ select: { id: true, name: true } })
}

export async function listSampleOptions(): Promise<Option[]> {
  return db.sample.findMany({ select: { id: true, name: true } })
}

export async function listEquipmentOptions(): Promise<Option[]> {
  return db.equipment.findMany({ select: { id: true, name: true } })
}

export async function listMemberOptions(): Promise<Option[]> {
  return db.member.findMany({ select: { id: true, name: true } })
}
