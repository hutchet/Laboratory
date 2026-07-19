import { listSamples, listCustomerOptions, listProjectOptions } from "@/features/samples/queries"
import { SamplesView } from "@/features/samples/components/SamplesView"

export default async function SamplesPage() {
  const [samples, customers, projects] = await Promise.all([listSamples(), listCustomerOptions(), listProjectOptions()])
  return <SamplesView samples={samples} customers={customers} projects={projects} />
}
