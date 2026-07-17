"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveProject(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    name: String(formData.get("name") || ""),
    status: String(formData.get("status") || "doing"),
    customerId: String(formData.get("customerId") || "") || null,
    centerId: String(formData.get("centerId") || "") || null,
    value: formData.get("value") ? Number(formData.get("value")) : null,
    startDate: formData.get("startDate") ? new Date(String(formData.get("startDate"))) : null,
    endDate: formData.get("endDate") ? new Date(String(formData.get("endDate"))) : null,
  }
  if (id) {
    await db.project.update({ where: { id }, data })
  } else {
    await db.project.create({ data })
  }
  revalidatePath("/projects")
  revalidatePath("/dash")
}

export async function deleteProject(id: string) {
  await db.project.delete({ where: { id } })
  revalidatePath("/projects")
  revalidatePath("/dash")
}
