"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function createPlan(formData: FormData) {
  const projectId = String(formData.get("projectId") || "")
  const title = String(formData.get("title") || "")
  await db.testPlan.create({ data: { projectId, title } })
  revalidatePath("/plan")
}

export async function deletePlan(id: string) {
  await db.testPlan.delete({ where: { id } })
  revalidatePath("/plan")
}

export async function saveItem(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    testPlanId: String(formData.get("testPlanId") || ""),
    sampleId: String(formData.get("sampleId") || "") || null,
    name: String(formData.get("name") || ""),
    priority: String(formData.get("priority") || "med"),
    standard: String(formData.get("standard") || "") || null,
    assignee: String(formData.get("assignee") || "") || null,
    planStart: formData.get("planStart") ? new Date(String(formData.get("planStart"))) : null,
    planEnd: formData.get("planEnd") ? new Date(String(formData.get("planEnd"))) : null,
    actualStart: formData.get("actualStart") ? new Date(String(formData.get("actualStart"))) : null,
    actualEnd: formData.get("actualEnd") ? new Date(String(formData.get("actualEnd"))) : null,
    result: String(formData.get("result") || "pending"),
    progress: formData.get("progress") ? Number(formData.get("progress")) : 0,
    note: String(formData.get("note") || "") || null,
  }
  if (id) {
    await db.testItem.update({ where: { id }, data })
  } else {
    await db.testItem.create({ data })
  }
  revalidatePath("/plan")
  revalidatePath("/dash")
}

export async function deleteItem(id: string) {
  await db.testItem.delete({ where: { id } })
  revalidatePath("/plan")
}
