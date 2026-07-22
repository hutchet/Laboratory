"use server"

import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can, getUserRbacContext, assertScopedAccess } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "equipment", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
  return userId
}

// Equipment/Booking la module cross-cutting (OPERATIONS_CROSS_CENTER_MODULES) — thanh
// vien Nhom van hanh (isOperations) va Giam doc thay/sua duoc moi Trung tam. Truong
// phong (dept_head) khong thuoc Nhom van hanh thi van chi duoc sua thiet bi/lich dat
// cua dung Trung tam minh phu trach — ham nay ep centerId khi tao moi va chan sua/xoa
// ngoai pham vi, giong assertScopedAccess nhung rieng cho Equipment/Booking (khong co
// groupId, chi co centerId).
async function scopedEquipmentCenterId(userId: string, requested?: string | null): Promise<string | null> {
  const ctx = await getUserRbacContext(userId)
  if (ctx.rank === "director" || ctx.isOperations) return requested || null
  return ctx.centerId ?? null
}

export type SaveEquipmentInput = {
  id?: string
  name: string
  code?: string | null
  category?: string | null
  manufacturer?: string | null
  model?: string | null
  qty?: number | null
  status?: string | null
  room?: string | null
  area?: number | null
  power?: number | null
  spec?: string | null
  centerId?: string | null
  hourlyRate?: number | null
  calLast?: string | null
  calInterval?: number | null
  calCert?: string | null
  calVendor?: string | null
}

export async function saveEquipment(input: SaveEquipmentInput) {
  const userId = await requirePermission(input.id ? "edit" : "create")
  const data = {
    name: input.name,
    code: input.code || null,
    category: input.category || null,
    manufacturer: input.manufacturer || null,
    model: input.model || null,
    qty: input.qty ?? null,
    status: input.status || "active",
    room: input.room || null,
    area: input.area ?? null,
    power: input.power ?? null,
    spec: input.spec || null,
    centerId: await scopedEquipmentCenterId(userId, input.centerId),
    hourlyRate: input.hourlyRate ?? null,
    calLast: input.calLast ? new Date(input.calLast) : null,
    calInterval: input.calInterval ?? null,
    calCert: input.calCert || null,
    calVendor: input.calVendor || null,
  }
  let saved
  // y/c 116.1: moi lan luu Thiet bi (them moi hoac sua) phai TU DONG tao/dong bo
  // (upsert) ban ghi DepreciationAsset lien ket 1:1 (equipmentId) — dong bo ten,
  // nhom, trung tam theo Thiet bi ngay tai thoi diem luu, khong doi den luc trang
  // Khau hao thiet bi duoc mo ra moi backfill (xem listDepreciationAssets). Dung
  // $transaction de dam bao Thiet bi + Khau hao cung thanh cong hoac cung that bai.
  if (input.id) {
    const existing = await db.equipment.findUnique({ where: { id: input.id } })
    const ctx = await getUserRbacContext(userId)
    assertScopedAccess(ctx, "equipment", existing)
    saved = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.equipment.update({ where: { id: input.id }, data })
      return updated
    })
  } else {
    saved = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.equipment.create({ data })
      return created
    })
    await logAudit("equipment", "create", data.name, `Thêm thiết bị mới “${data.name}”`)
  }
  revalidatePath("/equipment")
  revalidatePath("/dash")
  revalidatePath("/depreciation")
  return saved
}

export async function deleteEquipment(id: string) {
  const userId = await requirePermission("delete")
  const existing = await db.equipment.findUnique({ where: { id } })
  const ctx = await getUserRbacContext(userId)
  assertScopedAccess(ctx, "equipment", existing)
  await db.equipment.delete({ where: { id } })
  await logAudit("equipment", "delete", existing?.name || id, `Xoá thiết bị “${existing?.name || id}”`)
  revalidatePath("/equipment")
}

export async function bulkDeleteEquipment(ids: string[]) {
  const userId = await requirePermission("delete")
  const ctx = await getUserRbacContext(userId)
  const existingList = await db.equipment.findMany({ where: { id: { in: ids } } })
  for (const item of existingList) assertScopedAccess(ctx, "equipment", item)
  await db.equipment.deleteMany({ where: { id: { in: ids } } })
  await logAudit("equipment", "delete", `${ids.length} thiết bị`, `Xoá hàng loạt ${ids.length} thiết bị đã chọn`)
  revalidatePath("/equipment")
}

export type SaveBookingInput = {
  id?: string
  equipmentId: string
  centerId?: string | null
  startTime: string
  endTime: string
  bookedBy?: string | null
  department?: string | null
  purpose?: string | null
}

// Loi "nghiep vu" da duoc kiem tra ro rang (vd: trung gio, thieu thiet bi...).
// Duoc phan biet voi loi he thong khong mong muon (Prisma/DB) o catch-all ben
// duoi, de khong lam mat thong bao ro rang khi rethrow.
class BookingActionError extends Error {}

export async function saveBooking(input: SaveBookingInput) {
  try {
    const userId = await requirePermission(input.id ? "edit" : "create")
    const start = new Date(input.startTime)
    const end = new Date(input.endTime)
    // Port cua cac buoc kiem tra trong saveBookingForm ban goc (dong 6756-6776):
    // gio ket thuc phai sau gio bat dau, thiet bi dang bao tri thi khong duoc dat,
    // va khong duoc trung khung gio voi 1 lich dat khac cua cung thiet bi.
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BookingActionError("Ngày giờ không hợp lệ, vui lòng nhập lại.")
    }
    if (!(end.getTime() > start.getTime())) {
      throw new BookingActionError("Giờ kết thúc phải sau giờ bắt đầu.")
    }
    const equipment = await db.equipment.findUnique({ where: { id: input.equipmentId } })
    if (!equipment) throw new BookingActionError("Không tìm thấy thiết bị.")
    if (equipment.status === "maintenance") {
      throw new BookingActionError("Thiết bị này đang bảo trì, không thể đặt lịch.")
    }
    // Lich dat luon theo dung Trung tam cua thiet bi — khong nhan centerId tuy y tu client.
    {
      const ctx = await getUserRbacContext(userId)
      assertScopedAccess(ctx, "bookings", equipment)
      if (input.id) {
        const existingBooking = await db.equipmentBooking.findUnique({ where: { id: input.id } })
        if (!existingBooking) throw new BookingActionError("Lịch đặt không còn tồn tại, có thể đã bị xóa.")
        assertScopedAccess(ctx, "bookings", existingBooking)
      }
    }
    const conflict = await db.equipmentBooking.findFirst({
      where: {
        equipmentId: input.equipmentId,
        ...(input.id ? { id: { not: input.id } } : {}),
        startTime: { lt: end },
        endTime: { gt: start },
      },
    })
    if (conflict) {
      throw new BookingActionError(
        `Thiết bị này đã được ${conflict.bookedBy || "người khác"} đặt từ ${conflict.startTime.toLocaleString("vi-VN")} đến ${conflict.endTime.toLocaleString("vi-VN")}. Vui lòng chọn khung giờ khác hoặc ngày khác.`
      )
    }
    const data = {
      equipmentId: input.equipmentId,
      centerId: equipment.centerId,
      startTime: start,
      endTime: end,
      bookedBy: input.bookedBy || null,
      department: input.department || null,
      purpose: input.purpose || null,
    }
    if (input.id) {
      await db.equipmentBooking.update({ where: { id: input.id }, data })
    } else {
      await db.equipmentBooking.create({ data })
      await logAudit("equipment", "create", input.equipmentId, "Thêm lịch đặt thiết bị")
    }
    revalidatePath("/equipment")
  } catch (err) {
    // Cac loi nghiep vu (BookingActionError) va loi phan quyen (requirePermission/
    // assertScopedAccess) da co thong bao ro rang bang tieng Viet — giu nguyen.
    // Loi con lai (Prisma/DB/that bai khong mong muon) se bi Next.js che thanh
    // "Application error: a server-side exception has occurred" khong ro nguyen
    // nhan o phia client — o day ta log chi tiet o server va tra ve 1 thong bao
    // ro rang, an toan cho client thay vi de loi tho lot ra ngoai.
    if (err instanceof BookingActionError || err instanceof Error && /quyền|permission/i.test(err.message)) {
      throw err
    }
    console.error("[saveBooking] Lỗi hệ thống không mong muốn:", err)
    throw new Error("Không thể lưu lịch đặt thiết bị do lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên (đã ghi log lỗi để kiểm tra).")
  }
}

export async function deleteBooking(id: string) {
  const userId = await requirePermission("delete")
  const existing = await db.equipmentBooking.findUnique({ where: { id } })
  const ctx = await getUserRbacContext(userId)
  assertScopedAccess(ctx, "bookings", existing)
  await db.equipmentBooking.delete({ where: { id } })
  await logAudit("equipment", "delete", id, "Xoá lịch đặt thiết bị")
  revalidatePath("/equipment")
}

// y/c #105.3: bo sung xoa hang loat lich dat (mau voi bulkDeleteEquipment) de
// module chinh sua chuan hoa (chon nhieu + xoa tat ca) hoat dong duoc tren trang Dat lich.
export async function bulkDeleteBooking(ids: string[]) {
  const userId = await requirePermission("delete")
  const ctx = await getUserRbacContext(userId)
  const existingList = await db.equipmentBooking.findMany({ where: { id: { in: ids } } })
  for (const item of existingList) assertScopedAccess(ctx, "bookings", item)
  await db.equipmentBooking.deleteMany({ where: { id: { in: ids } } })
  await logAudit("equipment", "delete", `${ids.length} lịch đặt`, `Xoá hàng loạt ${ids.length} lịch đặt đã chọn`)
  revalidatePath("/equipment")
}
