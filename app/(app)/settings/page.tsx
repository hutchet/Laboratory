import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import SettingsClient from "./SettingsClient"

export default async function SettingsPage() {
  const session = await auth()
  let roleLabel = "Chưa xác định"
  if (session?.user?.id) {
    const roles = await db.userRole.findMany({ where: { userId: session.user.id }, include: { role: true } })
    roleLabel = roles.map((r) => r.role.name).join(", ") || "Chưa có vai trò"
  }
  return <SettingsClient roleLabel={roleLabel} />
}
