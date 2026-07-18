"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"

// Creates a new sample ("pack") scoped to a project — mirrors the original
// "+ Thêm mẫu" flow: code, serial, qty, received date, storage location.
// Status always starts as "received".
export async function addSampleForProject(formData: FormData) {
  const projectId = String(formData.get("projectId") || "")
  const code = String(formData.get("code") || "").trim()
  if (!projectId || !code) return
  await db.sample.create({
    data: {
      projectId,
      code,
      name: code,
      serialNumber: String(formData.get("serialNumber") || "") || null,
      qty: Math.max(1, parseInt(String(formData.get("qty") || "1"), 10) || 1),
      receivedAt: formData.get("receivedAt") ? new Date(String(formData.get("receivedAt"))) : null,
      storageLocation: String(formData.get("storageLocation") || "") || null,
      status: "received",
    },
  })
  await logAudit("sample", "create", code, `Thêm mẫu mới “${code}”`)
  revalidatePath("/samples")
  revalidatePath("/plan")
  revalidatePath("/dash")
}

// Updates an existing sample's tracking fields — mirrors the original
// "Cập nhật mẫu" popup: received date, storage location, status (empty = auto).
export async function updateSampleTracking(formData: FormData) {
  const id = String(formData.get("id") || "")
  if (!id) return
  const status = String(formData.get("status") || "")
  await db.sample.update({
    where: { id },
    data: {
      receivedAt: formData.get("receivedAt") ? new Date(String(formData.get("receivedAt"))) : null,
      storageLocation: String(formData.get("storageLocation") || "") || null,
      status: status || null,
    },
  })
  revalidatePath("/samples")
  revalidatePath("/plan")
}

export async function deleteSample(id: string) {
  const existing = await db.sample.findUnique({ where: { id } })
  await db.sample.delete({ where: { id } })
  await logAudit("sample", "delete", existing?.code || id, `Xóa mẫu “${existing?.code || id}”`)
  revalidatePath("/samples")
  revalidatePath("/plan")
}
