import { db } from "@/lib/db"
import SamplesClient from "./SamplesClient"

export default async function SamplesPage() {
  const samples = await db.sample.findMany({ include: { customer: true }, orderBy: { createdAt: "desc" } })
  const customers = await db.customer.findMany({ select: { id: true, name: true } })
  const rows = samples.map((s) => ({
    id: s.id, code: s.code, name: s.name, customerId: s.customerId, customerName: s.customer?.name ?? null,
    status: s.status, receivedAt: s.receivedAt ? s.receivedAt.toISOString() : null,
  }))
  return <SamplesClient samples={rows} customers={customers} />
}
