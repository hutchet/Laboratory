"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can, getUserRbacContext, assertScopedAccess } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "samples", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
  return userId
}

export type SaveSampleInput = {
  id?: string
  code: string
  serialNumber?: string | null
  qty?: number | null
  storageLocation?: string | null
  customerId?: string | null
  projectId?: string | null
  sampleGrade?: string | null
  group?: string | null
  status?: string | null
  receivedAt?: string | null
}

export async function saveSample(input: SaveSampleInput) {
  const userId = await requirePermission(input.id ? "edit" : "create")
  const data: Record<string, unknown> = {
    code: input.code,
    name: input.code,
    serialNumber: input.serialNumber || null,
    qty: input.qty ?? 1,
    storageLocation: input.storageLocation || null,
    customerId: input.customerId || null,
    projectId: input.projectId || null,
    sampleGrade: input.sampleGrade || null,
    group: input.group || null,
    status: input.status || null,
    receivedAt: input.receivedAt ? new Date(input.receivedAt) : null,
  }
  if (input.id) {
    const existing = await db.sample.findUnique({ where: { id: input.id } })
    const ctx = await getUserRbacContext(userId)
    assertScopedAccess(ctx, "samples", existing)
    await db.sample.update({ where: { id: input.id }, data })
  } else {
    // Gan centerId/groupId (khac field "group" tu do o tren) theo Trung tam/Nhom cua
    // nguoi tao — dung cho phan vung du lieu getScopeFilter, khong doi hien thi cu.
    const ctx = await getUserRbacContext(userId)
    data.centerId = ctx.centerId ?? null
    data.groupId = ctx.groupId ?? null
    const created = await db.sample.create({ data: data as Parameters<typeof db.sample.create>[0]["data"] })
    await logAudit("sample", "create", created.code || "", `Thêm mẫu mới “${created.code}”`)
  }
  revalidatePath("/samples")
  revalidatePath("/plan")
  revalidatePath("/dash")
}

export async function deleteSample(id: string) {
  const userId = await requirePermission("delete")
  const existing = await db.sample.findUnique({ where: { id } })
  const ctx = await getUserRbacContext(userId)
  assertScopedAccess(ctx, "samples", existing)
  await db.sample.delete({ where: { id } })
  await logAudit("sample", "delete", existing?.code || id, `Xoá mẫu “${existing?.code || id}”`)
  revalidatePath("/samples")
  revalidatePath("/plan")
}
