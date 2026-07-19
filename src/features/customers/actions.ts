"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "customers", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

export type SaveCustomerInput = {
  id?: string
  name: string
  contact?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  value?: number | null
  notes?: string | null
}

export async function saveCustomer(input: SaveCustomerInput) {
  await requirePermission(input.id ? "edit" : "create")
  const data = {
    name: input.name,
    contact: input.contact || null,
    email: input.email || null,
    phone: input.phone || null,
    address: input.address || null,
    value: input.value ?? null,
    notes: input.notes || null,
  }
  if (input.id) {
    await db.customer.update({ where: { id: input.id }, data })
  } else {
    await db.customer.create({ data })
  }
  revalidatePath("/customers")
  revalidatePath("/dash")
}

export async function deleteCustomer(id: string) {
  await requirePermission("delete")
  await db.customer.delete({ where: { id } })
  revalidatePath("/customers")
}
