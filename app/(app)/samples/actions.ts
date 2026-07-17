"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveSample(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    code: String(formData.get("code") || "") || null,
    name: String(formData.get("name") || ""),
    customerId: String(formData.get("customerId") || "") || null,
    status: String(formData.get("status") || "received"),
    receivedAt: formData.get("receivedAt") ? new Date(String(formData.get("receivedAt"))) : null,
  }
  if (id) {
    await db.sample.update({ where: { id }, data })
  } else {
    await db.sample.create({ data })
  }
  revalidatePath("/samples")
  revalidatePath("/dash")
}

export async function deleteSample(id: string) {
  await db.sample.delete({ where: { id } })
  revalidatePath("/samples")
}
