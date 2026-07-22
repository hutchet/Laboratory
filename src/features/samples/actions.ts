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

// Dong bo 1 chieu Sample -> TestPack (xem prisma/schema.prisma::TestPack.sampleId,
// Sample.testPack). Moi mau duoc quan ly o trang "Quan ly mau" tu dong sinh/cap nhat
// dung 1 goi thu (TestPack) tuong ung o trang "Ke hoach thu nghiem" - khong can nguoi
// dung bam "+ Them mau" thu cong nua. Chi dong bo khi mau co gan Du an (goi thu bat
// buoc phai thuoc 1 Ke hoach thu nghiem, ma ke hoach lai gan voi 1 du an).
async function findOrCreateTestPlanForProject(projectId: string) {
  const existing = await db.testPlan.findFirst({ where: { projectId } })
  if (existing) return existing
  return db.testPlan.create({ data: { projectId } })
}

async function syncSampleTestPack(sampleId: string, input: { code: string; serialNumber?: string | null; qty?: number | null; projectId?: string | null }) {
  if (!input.projectId) return
  const plan = await findOrCreateTestPlanForProject(input.projectId)
  const packData = { testPlanId: plan.id, code: input.code, serial: input.serialNumber || null, qty: input.qty ?? 1 }
  const existingPack = await db.testPack.findUnique({ where: { sampleId } })
  if (existingPack) {
    await db.testPack.update({ where: { id: existingPack.id }, data: packData })
  } else {
    await db.testPack.create({ data: { ...packData, sampleId } })
  }
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
  let sampleId = input.id
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
    sampleId = created.id
    await logAudit("sample", "create", created.code ?? "", `Thêm mẫu mới “${created.code ?? ""}”`)
  }
  if (sampleId) {
    await syncSampleTestPack(sampleId, { code: input.code, serialNumber: input.serialNumber, qty: input.qty, projectId: input.projectId })
  }
  revalidatePath("/samples")
  revalidatePath("/plan")
  revalidatePath("/dash")
}

export async function deleteSample(id: string) {
  const userId = await requirePermission("delete")
  const existing = await db.sample.findUnique({ where: { id }, include: { testPack: { include: { items: true } } } })
  const ctx = await getUserRbacContext(userId)
  assertScopedAccess(ctx, "samples", existing)
  // Neu goi thu dong bo chua co bai thu nao, xoa luon cho gon; neu da co bai
  // thu, giu lai goi thu (chuyen thanh goi "thu cong", sampleId tu dong ve
  // null nho quan he optional trong schema) de khong mat du lieu da thu.
  if (existing?.testPack && existing.testPack.items.length === 0) {
    await db.testPack.delete({ where: { id: existing.testPack.id } })
  }
  await db.sample.delete({ where: { id } })
  await logAudit("sample", "delete", existing?.code || id, `Xoá mẫu “${existing?.code || id}”`)
  revalidatePath("/samples")
  revalidatePath("/plan")
}

export async function bulkDeleteSamples(ids: string[]) {
  const userId = await requirePermission("delete")
  const ctx = await getUserRbacContext(userId)
  const existingList = await db.sample.findMany({ where: { id: { in: ids } }, include: { testPack: { include: { items: true } } } })
  for (const existing of existingList) {
    assertScopedAccess(ctx, "samples", existing)
    if (existing.testPack && existing.testPack.items.length === 0) {
      await db.testPack.delete({ where: { id: existing.testPack.id } })
    }
  }
  await db.sample.deleteMany({ where: { id: { in: ids } } })
  await logAudit("sample", "delete", `${ids.length} mẫu`, `Xoá hàng loạt ${ids.length} mẫu`)
  revalidatePath("/samples")
  revalidatePath("/plan")
}
