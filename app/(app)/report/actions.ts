"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveReport(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    title: String(formData.get("title") || ""),
    content: String(formData.get("content") || "") || null,
    projectId: String(formData.get("projectId") || "") || null,
  }
  if (id) {
    await db.report.update({ where: { id }, data })
  } else {
    await db.report.create({ data })
  }
  revalidatePath("/report")
}

export async function deleteReport(id: string) {
  await db.report.delete({ where: { id } })
  revalidatePath("/report")
}
