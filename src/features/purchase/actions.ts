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
  const allowed = await can(userId, "purchase", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
  return userId
}

// Ported from openPmForm's save handler: 19-column purchase item shape.
export type SavePurchaseItemInput = {
  id?: string
  name: string
  quantity?: number | null
  cost?: number | null
  status?: string | null
  note?: string | null
  amount?: string | null
  price?: string | null
  supplier?: string | null
  task?: string | null
  tfs?: string | null
  jira?: string | null
  pr?: string | null
  po?: string | null
  migo?: string | null
  tinhtrang?: string | null
  pic?: string | null
  owner?: string | null
  lab?: string | null
  tfslink?: string | null
}

export async function savePurchaseItem(input: SavePurchaseItemInput) {
  const userId = await requirePermission(input.id ? "edit" : "create")
  // Ported validation from openPmForm: "Vui long nhap ten hang muc".
  if (!input.name || !input.name.trim()) throw new Error("Vui lòng nhập tên hạng mục")
  const data: Record<string, unknown> = {
    name: input.name.trim(),
    quantity: input.quantity ?? null,
    cost: input.cost ?? null,
    status: input.status || "On-going",
    note: input.note || null,
    amount: input.amount || null,
    price: input.price || null,
    supplier: input.supplier || null,
    task: input.task || null,
    tfs: input.tfs || null,
    jira: input.jira || null,
    pr: input.pr || null,
    po: input.po || null,
    migo: input.migo || null,
    tinhtrang: input.tinhtrang || null,
    pic: input.pic || null,
    owner: input.owner || null,
    lab: input.lab || null,
    tfslink: input.tfslink || null,
  }
  if (input.id) {
    const existing = await db.purchaseItem.findUnique({ where: { id: input.id } })
    const ctx = await getUserRbacContext(userId)
    assertScopedAccess(ctx, "purchase", existing)
    await db.purchaseItem.update({ where: { id: input.id }, data })
  } else {
    const ctx = await getUserRbacContext(userId)
    data.centerId = ctx.centerId ?? null
    data.groupId = ctx.groupId ?? null
    const created = await db.purchaseItem.create({ data: data as Parameters<typeof db.purchaseItem.create>[0]["data"] })
    await logAudit("purchase", "create", created.name, `Thêm hạng mục mua hàng “${created.name}”`)
  }
  revalidatePath("/purchase")
}

export async function deletePurchaseItem(id: string) {
  const userId = await requirePermission("delete")
  const existing = await db.purchaseItem.findUnique({ where: { id } })
  const ctx = await getUserRbacContext(userId)
  assertScopedAccess(ctx, "purchase", existing)
  await db.purchaseItem.delete({ where: { id } })
  revalidatePath("/purchase")
}

// Ported from pm-bulk-del: bulk-select delete inside a group's detail table.
export async function bulkDeletePurchaseItems(ids: string[]) {
  const userId = await requirePermission("delete")
  if (!ids.length) return
  const ctx = await getUserRbacContext(userId)
  const existingList = await db.purchaseItem.findMany({ where: { id: { in: ids } } })
  for (const item of existingList) assertScopedAccess(ctx, "purchase", item)
  await db.purchaseItem.deleteMany({ where: { id: { in: ids } } })
  await logAudit("purchase", "delete", `${ids.length} hạng mục`, `Xoá hàng loạt ${ids.length} hạng mục mua hàng đã chọn`)
  revalidatePath("/purchase")
}
