import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import type { MemberRow } from "./types"

export async function listMembers(): Promise<MemberRow[]> {
  return db.member.findMany({ orderBy: { name: "asc" } })
}

export type CurrentMemberInfo = {
  name: string
  email: string | null
  accessRole: string | null
}

// Ported from the original's adminbar (#adminbar-av/#adminbar-nm/#adminbar-em,
// updateAdminDisplay()): shows the currently logged-in account, matched to a
// Member row by email when possible, falling back to the account name/email
// alone and to the first "admin" member's role label if no match is found.
export async function getCurrentMemberInfo(): Promise<CurrentMemberInfo> {
  const session = await auth()
  const email = session?.user?.email ?? null
  const name = session?.user?.name || email || "Người dùng"
  const matched = email ? await db.member.findUnique({ where: { email } }) : null
  if (matched) {
    return { name: matched.name, email: matched.email, accessRole: matched.accessRole }
  }
  const admin = await db.member.findFirst({ where: { accessRole: "admin" } })
  return { name, email, accessRole: admin?.accessRole ?? "admin" }
}
