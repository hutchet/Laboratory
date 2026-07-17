"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createPlan(formData: FormData) {
  const title = String(formData.get("title") || "")
  await db.auditPlan.create({ data: { title, status: "doing" } })
  revalidatePath("/auditplan")
}

export async function addPhase(formData: FormData) {
  const auditPlanId = String(formData.get("auditPlanId") || "")
  const name = String(formData.get("name") || "")
  const count = await db.auditPhase.count({ where: { auditPlanId } })
  await db.auditPhase.create({ data: { auditPlanId, name, order: count } })
  revalidatePath("/auditplan")
}

export async function saveItem(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    auditPlanId: String(formData.get("auditPlanId") || ""),
    phaseId: String(formData.get("phaseId") || "") || null,
    name: String(formData.get("name") || ""),
    assignee: String(formData.get("assignee") || "") || null,
    planStart: formData.get("planStart") ? new Date(String(formData.get("planStart"))) : null,
    planEnd: formData.get("planEnd") ? new Date(String(formData.get("planEnd"))) : null,
    status: String(formData.get("status") || "todo"),
    note: String(formData.get("note") || "") || null,
  }
  if (id) {
    await db.auditItem.update({ where: { id }, data })
  } else {
    await db.auditItem.create({ data })
  }
  revalidatePath("/auditplan")
}

export async function deleteItem(id: string) {
  await db.auditItem.delete({ where: { id } })
  revalidatePath("/auditplan")
}

export async function deletePlan(id: string) {
  await db.auditPlan.delete({ where: { id } })
  revalidatePath("/auditplan")
}
