"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveCustomer(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    name: String(formData.get("name") || ""),
    contact: String(formData.get("contact") || "") || null,
    email: String(formData.get("email") || "") || null,
    phone: String(formData.get("phone") || "") || null,
    address: String(formData.get("address") || "") || null,
    value: formData.get("value") ? Number(formData.get("value")) : null,
    notes: String(formData.get("notes") || "") || null,
  }
  if (id) {
    await db.customer.update({ where: { id }, data })
  } else {
    await db.customer.create({ data })
  }
  revalidatePath("/customers")
  revalidatePath("/dash")
}

export async function deleteCustomer(id: string) {
  await db.customer.delete({ where: { id } })
  revalidatePath("/customers")
}
