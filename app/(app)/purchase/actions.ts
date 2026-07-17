"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

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
  } else {
    await db.purchaseItem.create({ data })
  }
  revalidatePath("/purchase")
}

export async function deletePurchase(id: string) {
  await db.purchaseItem.delete({ where: { id } })
  revalidatePath("/purchase")
}

export async function deleteAllPurchase() {
  await db.purchaseItem.deleteMany({})
  revalidatePath("/purchase")
}

export async function deleteManyPurchase(ids: string[]) {
  if (!ids.length) return
  await db.purchaseItem.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/purchase")
}
