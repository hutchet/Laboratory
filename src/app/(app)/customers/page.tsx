import { listCustomers } from "@/features/customers/queries"
import { CustomersView } from "@/features/customers/components/CustomersView"

export default async function CustomersPage() {
  const customers = await listCustomers()
  return <CustomersView customers={customers} />
}
