"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

export async function savePurchase(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    name: String(formData.get("name") || ""),
    quantity: formData.get("quantity") ? Number(formData.get("quantity")) : null,
    cost: formData.get("cost") ? Number(formData.get("cost")) : null,
    status: String(formData.get("status") || "ongoing"),
    note: String(formData.get("note") || "") || null,
  }
  if (id) {
    await db.purchaseItem.update({ where: { id }, data })
    await logAudit("purchase", "update", data.name, `Cập nhật mặt hàng mua sắm “${data.name}”`)
  } else {
    const created = await db.purchaseItem.create({ data })
    await logAudit("purchase", "create", data.name, `Thêm mặt hàng mua sắm mới “${data.name}” (#${created.id})`)
  }
  revalidatePath("/purchase")
}

export async function deletePurchase(id: string) {
  const existing = await db.purchaseItem.findUnique({ where: { id } })
  await db.purchaseItem.delete({ where: { id } })
  await logAudit("purchase", "delete", existing?.name || id, `Xóa mặt hàng mua sắm “${existing?.name || id}”`)
  revalidatePath("/purchase")
}

export async function deleteAllPurchase() {
  await db.purchaseItem.deleteMany({})
  await logAudit("purchase", "delete", "tất cả", `Xóa toàn bộ danh sách mua sắm`)
  revalidatePath("/purchase")
}

export async function deleteManyPurchase(ids: string[]) {
  if (!ids.length) return
  await db.purchaseItem.deleteMany({ where: { id: { in: ids } } })
  await logAudit("purchase", "delete", `${ids.length} mặt hàng`, `Xóa hàng loạt ${ids.length} mặt hàng mua sắm`)
  revalidatePath("/purchase")
}
