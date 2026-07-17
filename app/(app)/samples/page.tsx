import { db } from "@/lib/db"
import SamplesClient from "./SamplesClient"

export default async function SamplesPage() {
  const samples = await db.sample.findMany({
    include: { customer: true, project: { include: { customer: true } }, testItems: { select: { result: true, actualStart: true } } },
    orderBy: { createdAt: "desc" },
  })
  const customers = await db.customer.findMany({ select: { id: true, name: true } })
  const projects = await db.project.findMany({ select: { id: true, name: true } })
  const rows = samples.map((s) => {
    const testTotal = s.testItems.length
    const testDone = s.testItems.filter((i) => i.result === "pass").length
    const testClosed = s.testItems.filter((i) => i.result === "pass" || i.result === "fail").length
    const testStarted = s.testItems.filter((i) => i.actualStart).length
    return {
      id: s.id,
      code: s.code,
      serialNumber: s.serialNumber,
      qty: s.qty ?? 1,
      storageLocation: s.storageLocation,
      customerId: s.customerId ?? s.project?.customerId ?? null,
      customerName: s.customer?.name ?? s.project?.customer?.name ?? null,
      projectId: s.projectId,
      projectName: s.project?.name ?? null,
      status: s.status,
      receivedAt: s.receivedAt ? s.receivedAt.toISOString() : null,
      testTotal,
      testDone,
      testClosed,
      testStarted,
    }
  })
  return <SamplesClient samples={rows} customers={customers} projects={projects} />
}
