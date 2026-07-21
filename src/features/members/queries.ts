import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import type { MemberRow } from "./types"
import type { Option } from "@/features/projects/types"

export async function listMembers(): Promise<MemberRow[]> {
  const rows = await db.member.findMany({ orderBy: { name: "asc" }, include: { center: true, group: true } })
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    code: m.code,
    role: m.role,
    gender: m.gender,
    team: m.team,
    accessRole: m.accessRole,
    email: m.email,
    phone: m.phone,
    centerId: m.centerId,
    groupId: m.groupId,
    isOperations: m.isOperations,
    allCenters: m.allCenters,
    centerName: m.center?.name ?? null,
    groupName: m.group?.name ?? null,
  }))
}

// Dung cho dropdown chon Trung tam / Nhom trong form Thanh vien.
export async function listCenterOptions(): Promise<Option[]> {
  return db.center.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
}

export async function listGroupOptions(centerId?: string | null): Promise<Array<Option & { centerId: string }>> {
  const groups = await db.group.findMany({
    where: centerId ? { centerId } : undefined,
    select: { id: true, name: true, centerId: true },
    orderBy: { name: "asc" },
  })
  return groups
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
