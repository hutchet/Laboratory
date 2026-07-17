import { db } from "@/lib/db"
import MembersClient from "./MembersClient"

export default async function MembersPage() {
  const members = await db.member.findMany({ orderBy: { createdAt: "asc" } })
  return <MembersClient members={members} />
}
