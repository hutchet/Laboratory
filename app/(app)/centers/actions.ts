"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveCenter(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    name: String(formData.get("name") || ""),
    manager: String(formData.get("manager") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    address: String(formData.get("address") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  }
  if (id) {
    await db.center.update({ where: { id }, data })
  } else {
    await db.center.create({ data })
  }
  revalidatePath("/centers")
}

export async function deleteCenter(id: string) {
  await db.center.delete({ where: { id } })
  revalidatePath("/centers")
}
