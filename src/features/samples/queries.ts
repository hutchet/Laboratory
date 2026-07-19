import { db } from "@/shared/lib/db"
import type { SampleRow, Option } from "./types"
import { sampleAutoStatus } from "./types"

export async function listSamples(): Promise<SampleRow[]> {
  const samples = await db.sample.findMany({
    include: {
      customer: true,
      project: true,
      testItems: { select: { result: true, actualStart: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return samples.map((s) => {
    const items = s.testItems.map((it) => ({ result: it.result, actualStart: it.actualStart ? it.actualStart.toISOString() : null }))
    const doneCount = items.filter((i) => i.result === "pass").length
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      serialNumber: s.serialNumber,
      qty: s.qty,
      storageLocation: s.storageLocation,
      customerId: s.customerId,
      projectId: s.projectId,
      sampleGrade: s.sampleGrade,
      group: s.group,
      status: s.status,
      receivedAt: s.receivedAt ? s.receivedAt.toISOString() : null,
      customer: s.customer ? { id: s.customer.id, name: s.customer.name } : null,
      project: s.project ? { id: s.project.id, name: s.project.name } : null,
      derivedStatus: sampleAutoStatus({ status: s.status, items }),
      doneCount,
      totalItems: items.length,
    }
  })
}

export async function listCustomerOptions(): Promise<Option[]> {
  return db.customer.findMany({ select: { id: true, name: true } })
}

export async function listProjectOptions(): Promise<Option[]> {
  return db.project.findMany({ select: { id: true, name: true } })
}
