"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveMember(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    name: String(formData.get("name") || ""),
    code: String(formData.get("code") || "") || null,
    email: String(formData.get("email") || "") || null,
    gender: String(formData.get("gender") || "") || null,
    team: String(formData.get("team") || "") || null,
    accessRole: formData.get("admin") ? "admin" : "member",
  }
  if (id) {
    await db.member.update({ where: { id }, data })
  } else {
    await db.member.create({ data })
  }
  revalidatePath("/members")
}

export async function deleteMember(id: string) {
  await db.member.delete({ where: { id } })
  revalidatePath("/members")
}
