import { db } from "@/lib/db"
import SamplesClient from "./SamplesClient"

export default async function SamplesPage() {
  const samples = await db.sample.findMany({ include: { customer: true, project: true }, orderBy: { createdAt: "desc" } })
  const customers = await db.customer.findMany({ select: { id: true, name: true } })
  const projects = await db.project.findMany({ select: { id: true, name: true } })
  const rows = samples.map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    serialNumber: s.serialNumber,
    customerId: s.customerId,
    customerName: s.customer?.name ?? null,
    projectId: s.projectId,
    projectName: s.project?.name ?? null,
    sampleGrade: s.sampleGrade,
    group: s.group,
    status: s.status,
    receivedAt: s.receivedAt ? s.receivedAt.toISOString() : null,
  }))
  return <SamplesClient samples={rows} customers={customers} projects={projects} />
}
