import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import SettingsClient from "./SettingsClient"

export default async function SettingsPage() {
  const session = await auth()
  let roleLabel = "Chua xac dinh"
  if (session?.user?.id) {
    const roles = await db.userRole.findMany({ where: { userId: session.user.id }, include: { role: true } })
    roleLabel = roles.map((r) => r.role.name).join(", ") || "Chua co vai tro"
  }
  return <SettingsClient roleLabel={roleLabel} />
}
