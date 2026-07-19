import { listEquipment, listBookings, listCenterOptions } from "@/features/equipment/queries"
import { EquipmentView } from "@/features/equipment/components/EquipmentView"
import { BookingsView } from "@/features/equipment/components/BookingsView"

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const centers = await listCenterOptions()

  if (tab === "analytics") {
    const [bookings, equipment] = await Promise.all([listBookings(), listEquipment()])
    return <BookingsView bookings={bookings} equipment={equipment} centers={centers} />
  }

  const equipment = await listEquipment()
  return <EquipmentView equipment={equipment} centers={centers} />
}
