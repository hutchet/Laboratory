import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import MembersClient from "./MembersClient"

export default async function MembersPage() {
  const members = await db.member.findMany({ orderBy: { createdAt: "asc" } })
  const session = await auth()
  const userId = session?.user?.id
  const canManage = userId ? await can(userId, "members", "edit") : false
  return <MembersClient members={members} canManage={canManage} />
}
