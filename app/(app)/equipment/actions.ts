"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function saveEquipment(formData: FormData) {
  const id = String(formData.get("id") || "")
  const data = {
    name: String(formData.get("name") || ""),
    code: String(formData.get("code") || "") || null,
    category: String(formData.get("category") || "") || null,
    manufacturer: String(formData.get("manufacturer") || "") || null,
    model: String(formData.get("model") || "") || null,
    qty: formData.get("qty") ? Number(formData.get("qty")) : 1,
    status: String(formData.get("status") || "ready"),
    centerId: String(formData.get("centerId") || "") || null,
    room: String(formData.get("room") || "") || null,
    area: formData.get("area") ? Number(formData.get("area")) : null,
    power: formData.get("power") ? Number(formData.get("power")) : null,
    spec: String(formData.get("spec") || "") || null,
    calLast: formData.get("calLast") ? new Date(String(formData.get("calLast"))) : null,
    calInterval: formData.get("calInterval") ? Number(formData.get("calInterval")) : null,
    calCert: String(formData.get("calCert") || "") || null,
    calVendor: String(formData.get("calVendor") || "") || null,
  }
  if (id) {
    await db.equipment.update({ where: { id }, data })
  } else {
    await db.equipment.create({ data })
  }
  revalidatePath("/equipment")
  revalidatePath("/dash")
}

export async function deleteEquipment(id: string) {
  await db.equipment.delete({ where: { id } })
  revalidatePath("/equipment")
  revalidatePath("/dash")
}

export async function createBooking(formData: FormData) {
  const equipmentId = String(formData.get("equipmentId") || "")
  const date = String(formData.get("date") || "")
  const startHour = String(formData.get("startHour") || "")
  const endHour = String(formData.get("endHour") || "")
  const bookedBy = String(formData.get("bookedBy") || "") || null
  const department = String(formData.get("department") || "") || null
  const purpose = String(formData.get("purpose") || "") || null
  if (!equipmentId || !date || !startHour || !endHour) return
  const startTime = new Date(`${date}T${startHour}:00`)
  const endTime = new Date(`${date}T${endHour}:00`)
  const equipment = await db.equipment.findUnique({ where: { id: equipmentId } })
  await db.equipmentBooking.create({
    data: { equipmentId, centerId: equipment?.centerId ?? null, startTime, endTime, bookedBy, department, purpose },
  })
  revalidatePath("/equipment")
}

export async function deleteBooking(id: string) {
  await db.equipmentBooking.delete({ where: { id } })
  revalidatePath("/equipment")
}
