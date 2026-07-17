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
    lab: String(formData.get("lab") || "") || null,
    supplier: String(formData.get("supplier") || "") || null,
    task: String(formData.get("task") || "") || null,
    jira: String(formData.get("jira") || "") || null,
    pr: String(formData.get("pr") || "") || null,
    po: String(formData.get("po") || "") || null,
    migo: String(formData.get("migo") || "") || null,
    tinhtrang: String(formData.get("tinhtrang") || "") || null,
    pic: String(formData.get("pic") || "") || null,
    tfslink: String(formData.get("tfslink") || "") || null,
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
