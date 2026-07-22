import { listEquipment, listBookings, listCenterOptions } from "@/features/equipment/queries"
import { EquipmentView } from "@/features/equipment/components/EquipmentView"
import { BookingsView } from "@/features/equipment/components/BookingsView"

export default async function EquipmentPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const centers = await listCenterOptions()

  const [bookings, equipment] = await Promise.all([listBookings(), listEquipment()])

  if (tab === "analytics") {
    return <BookingsView bookings={bookings} equipment={equipment} centers={centers} />
  }

  return <EquipmentView equipment={equipment} centers={centers} bookings={bookings} />
}
