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
  const allowed = await can(userId, "projects", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

export type SaveProjectInput = {
  id?: string
  name: string
  customerId?: string | null
  centerId?: string | null
  value?: number | null
  startDate?: string | null
  endDate?: string | null
}

// Status, priority, progress, and due date are derived from linked Tasks (see queries.ts)
// and are never set manually here — mirrors the original app's projStats() behavior.
export async function saveProject(input: SaveProjectInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    name: input.name,
    customerId: input.customerId || null,
    centerId: input.centerId || null,
    value: input.value ?? null,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  }
  if (input.id) {
    await db.project.update({ where: { id: input.id }, data })
    await logAudit("project", "update", data.name, `Cập nhật dự án “${data.name}”`)
  } else {
    const created = await db.project.create({ data })
    await logAudit("project", "create", data.name, `Thêm dự án mới “${data.name}” (#${created.id})`)
  }
  revalidatePath("/projects")
  revalidatePath("/dash")
}

export async function deleteProject(id: string) {
  await requirePermission("delete")
  const existing = await db.project.findUnique({ where: { id } })
  await db.project.delete({ where: { id } })
  await logAudit("project", "delete", existing?.name || id, `Xoá dự án “${existing?.name || id}”`)
  revalidatePath("/projects")
  revalidatePath("/dash")
}
