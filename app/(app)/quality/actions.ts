"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function addChecklistItem(formData: FormData) {
  const name = String(formData.get("name") || "")
  const dueDate = formData.get("dueDate") ? new Date(String(formData.get("dueDate"))) : null
  await db.qualityChecklistItem.create({ data: { name, dueDate } })
  revalidatePath("/quality")
}

export async function toggleChecklistItem(id: string, done: boolean) {
  await db.qualityChecklistItem.update({ where: { id }, data: { done } })
  revalidatePath("/quality")
}

export async function deleteChecklistItem(id: string) {
  await db.qualityChecklistItem.delete({ where: { id } })
  revalidatePath("/quality")
}

export async function addAuditEntry(formData: FormData) {
  const data = {
    entity: String(formData.get("entity") || "") || null,
    actor: String(formData.get("actor") || "") || null,
    action: String(formData.get("action") || "") || null,
    note: String(formData.get("note") || "") || null,
  }
  await db.qualityAuditEntry.create({ data })
  revalidatePath("/quality")
}
