"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "centers", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

export type SaveCenterInput = {
  id?: string
  name: string
  address?: string | null
  manager?: string | null
  phone?: string | null
  notes?: string | null
}

export async function saveCenter(input: SaveCenterInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    name: input.name,
    address: input.address || null,
    manager: input.manager || null,
    phone: input.phone || null,
    notes: input.notes || null,
  }
  if (input.id) {
    await db.center.update({ where: { id: input.id }, data })
  } else {
    await db.center.create({ data })
  }
  revalidatePath("/centers")
}

export async function deleteCenter(id: string) {
  await requirePermission("delete")
  await db.center.delete({ where: { id } })
  revalidatePath("/centers")
}
