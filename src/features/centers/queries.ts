import { db } from "@/shared/lib/db"
import type { CenterRow, GroupRow, ViewerAccessGrant, ViewerCandidate } from "./types"

export async function listCenters(): Promise<CenterRow[]> {
  const centers = await db.center.findMany({
    orderBy: { name: "asc" },
    include: {
      projects: {
        select: {
          value: true,
          customerId: true,
          tasks: { select: { status: true } },
        },
      },
    },
  })
  return centers.map((c) => {
    const projectCount = c.projects.length
    const activeProjectCount = c.projects.filter((p) => p.tasks.length > 0 && p.tasks.some((t) => t.status !== "done")).length
    const customerIds = new Set(c.projects.map((p) => p.customerId).filter(Boolean))
    const totalValue = c.projects.reduce((sum, p) => sum + (p.value || 0), 0)
    return {
      id: c.id,
      name: c.name,
      address: c.address,
      manager: c.manager,
      phone: c.phone,
      notes: c.notes,
      elecPrice: c.elecPrice,
      rentPrice: c.rentPrice,
      projectCount,
      activeProjectCount,
      customerCount: customerIds.size,
      totalValue,
      createdAt: c.createdAt,
    }
  })
}

// Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
// Nhom van hanh (Section 3 va 12).
export async function listMemberOptions(): Promise<Array<{ id: string; name: string }>> {
  return db.member.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
}

// Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
// Nhom van hanh (Section 11): danh sach tai khoan "Chi xem" (viewer) co the duoc cap
// quyen xem them Trung tam, va danh sach quyen da cap.
export async function listViewerCandidates(): Promise<ViewerCandidate[]> {
  const users = await db.user.findMany({
    where: { userRoles: { some: { role: { name: "viewer" } } } },
    select: { id: true, email: true, name: true },
    orderBy: { email: "asc" },
  })
  if (users.length === 0) return []
  const emails = users.map((u) => u.email).filter(Boolean) as string[]
  const members = emails.length ? await db.member.findMany({ where: { email: { in: emails } }, select: { email: true, name: true } }) : []
  const nameByEmail = new Map(members.map((m) => [m.email, m.name]))
  return users.map((u) => ({
    userId: u.id,
    name: (u.email && nameByEmail.get(u.email)) || u.name || u.email || u.id,
    email: u.email || "",
  }))
}

export async function listViewerAccessGrants(): Promise<ViewerAccessGrant[]> {
  const grants = await db.viewerCenterAccess.findMany({
    orderBy: { createdAt: "desc" },
    include: { center: { select: { name: true } }, user: { select: { email: true, name: true } } },
  })
  if (grants.length === 0) return []
  const emails = grants.map((g) => g.user.email).filter(Boolean) as string[]
  const members = emails.length ? await db.member.findMany({ where: { email: { in: emails } }, select: { email: true, name: true } }) : []
  const nameByEmail = new Map(members.map((m) => [m.email, m.name]))
  return grants.map((g) => ({
    id: g.id,
    userId: g.userId,
    centerId: g.centerId,
    centerName: g.center?.name ?? null,
    viewerName: (g.user.email && nameByEmail.get(g.user.email)) || g.user.name || g.user.email || g.userId,
    viewerEmail: g.user.email ?? null,
  }))
}

export async function listGroups(centerId?: string): Promise<GroupRow[]> {
  const groups = await db.group.findMany({
    where: centerId ? { centerId } : undefined,
    orderBy: { name: "asc" },
    include: {
      center: { select: { name: true } },
      members: { select: { id: true } },
    },
  })
  const leadIds = Array.from(new Set(groups.map((g) => g.teamLeadId).filter(Boolean))) as string[]
  const leads = leadIds.length ? await db.member.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true } }) : []
  const leadNameById = new Map(leads.map((l) => [l.id, l.name]))
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    centerId: g.centerId,
    centerName: g.center?.name ?? null,
    teamLeadId: g.teamLeadId,
    teamLeadName: g.teamLeadId ? leadNameById.get(g.teamLeadId) ?? null : null,
    memberCount: g.members.length,
  }))
}
