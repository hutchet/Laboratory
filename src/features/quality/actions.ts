"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "quality", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

// Port cua cb.addEventListener('change', ...) trong renderQuality ban goc (dong 5586):
// chi cho tick tay cac hang muc KHONG co auto-state (validate lai o day, khong chi o UI,
// de tranh client gia mao request ghi de hang muc tu-dong).
const QL_AUTO_KEYS = ["cal", "audit", "role", "coc"]

export async function toggleChecklistKey(key: string, checked: boolean) {
  await requirePermission("edit")
  if (QL_AUTO_KEYS.includes(key)) {
    throw new Error("Hạng mục này tự động theo dự liệu, không thể tích tay")
  }
  await db.qualityChecklistState.upsert({
    where: { key },
    update: { checked },
    create: { key, checked },
  })
  revalidatePath("/quality")
}
