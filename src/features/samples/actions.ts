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
  const allowed = await can(userId, "samples", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
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
  await requirePermission(input.id ? "edit" : "create")
  const data = {
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
    await db.sample.update({ where: { id: input.id }, data })
  } else {
    await db.sample.create({ data })
    await logAudit("sample", "create", data.code, `Thêm mẫu mới “${data.code}”`)
  }
  revalidatePath("/samples")
  revalidatePath("/plan")
  revalidatePath("/dash")
}

export async function deleteSample(id: string) {
  await requirePermission("delete")
  const existing = await db.sample.findUnique({ where: { id } })
  await db.sample.delete({ where: { id } })
  await logAudit("sample", "delete", existing?.code || id, `Xoá mẫu “${existing?.code || id}”`)
  revalidatePath("/samples")
  revalidatePath("/plan")
}
