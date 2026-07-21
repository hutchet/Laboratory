"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "centers", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

export type SaveCenterInput = {
  id?: string
  name: string
  address?: string | null
  manager?: string | null
  phone?: string | null
  notes?: string | null
  elecPrice?: number | null
  rentPrice?: number | null
}

export async function saveCenter(input: SaveCenterInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    name: input.name,
    address: input.address || null,
    manager: input.manager || null,
    phone: input.phone || null,
    notes: input.notes || null,
    elecPrice: input.elecPrice ?? null,
    rentPrice: input.rentPrice ?? null,
  }
  if (input.id) {
    await db.center.update({ where: { id: input.id }, data })
  } else {
    await db.center.create({ data })
  }
  revalidatePath("/centers")
}

export async function deleteCenter(id: string) {
  await requirePermission("delete")
  await db.center.delete({ where: { id } })
  revalidatePath("/centers")
}

// Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
// Nhom van hanh (Section 3 va 12): quan ly Nhom van hanh trong 1 Trung tam.
// Dung chung requirePermission("centers", ...) vi Nhom la du lieu con cua Trung tam;
// nguoi co quyen sua Trung tam (director/dept_head) cung la nguoi tao/sua Nhom.
export type SaveGroupInput = {
  id?: string
  name: string
  centerId: string
  teamLeadId?: string | null
}

export async function saveGroup(input: SaveGroupInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    name: input.name,
    centerId: input.centerId,
    teamLeadId: input.teamLeadId || null,
  }
  if (input.id) {
    await db.group.update({ where: { id: input.id }, data })
    await logAudit("group", "update", data.name, `Cập nhật nhóm vận hành “${data.name}”`)
  } else {
    await db.group.create({ data })
    await logAudit("group", "create", data.name, `Thêm nhóm vận hành mới “${data.name}”`)
  }
  revalidatePath("/centers")
  revalidatePath("/members")
}

export async function deleteGroup(id: string) {
  await requirePermission("delete")
  const existing = await db.group.findUnique({ where: { id } })
  await db.group.delete({ where: { id } })
  await logAudit("group", "delete", existing?.name || id, `Xoá nhóm vận hành “${existing?.name || id}”`)
  revalidatePath("/centers")
  revalidatePath("/members")
}

// Thiet ke: Tai khoan 6 cap bac + Phan vung du lieu theo Trung tam thu nghiem &
// Nhom van hanh (Section 11): cap/thu hoi quyen xem (read-only) 1 Trung tam ngoai
// pham vi mac dinh cho tai khoan "Chi xem" (viewer). Dung chung requirePermission(
// "centers", ...) vi day la du lieu cap quyen gan voi Trung tam, nguoi sua Trung tam
// (director/dept_head) cung la nguoi cap quyen xem cho viewer.
export type GrantViewerAccessInput = { userId: string; centerId: string }

export async function grantViewerAccess(input: GrantViewerAccessInput) {
  await requirePermission("edit")
  const [user, center] = await Promise.all([
    db.user.findUnique({ where: { id: input.userId } }),
    db.center.findUnique({ where: { id: input.centerId } }),
  ])
  await db.viewerCenterAccess.upsert({
    where: { userId_centerId: { userId: input.userId, centerId: input.centerId } },
    create: { userId: input.userId, centerId: input.centerId },
    update: {},
  })
  await logAudit(
    "viewerAccess",
    "create",
    center?.name || input.centerId,
    `Cấp quyền xem Trung tâm “${center?.name || input.centerId}” cho ${user?.email || input.userId}`,
  )
  revalidatePath("/centers")
  revalidatePath("/members")
}

export async function revokeViewerAccess(id: string) {
  await requirePermission("edit")
  const existing = await db.viewerCenterAccess.findUnique({ where: { id }, include: { center: true, user: true } })
  if (existing) await db.viewerCenterAccess.delete({ where: { id } })
  await logAudit(
    "viewerAccess",
    "delete",
    existing?.center?.name || id,
    `Thu hồi quyền xem Trung tâm “${existing?.center?.name || id}” của ${existing?.user?.email || ""}`,
  )
  revalidatePath("/centers")
  revalidatePath("/members")
}
