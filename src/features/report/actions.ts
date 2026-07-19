"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { can } from "@/shared/lib/rbac"
import { logAudit } from "@/shared/lib/audit"
import { REPORT_COLUMNS } from "./types"
import type { ReportRowData } from "./types"

async function requirePermission(action: "create" | "edit" | "delete") {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) throw new Error("Không có quyền: chưa đăng nhập")
  const allowed = await can(userId, "report", action)
  if (!allowed) throw new Error("Không có quyền thực hiện hành động này")
}

// Giong nut "+ Them du an" / rf-submit trang Report ban goc: tao mot du an chi voi ten,
// du an nay dung chung bang Project nen se hien luon trong trang Projects.
export async function createReportProject(name: string): Promise<string> {
  await requirePermission("create")
  const created = await db.project.create({ data: { name, status: "doing" } })
  await logAudit("project", "create", name, `Thêm dự án mới từ trang Báo cáo “${name}” (#${created.id})`)
  revalidatePath("/report")
  revalidatePath("/projects")
  return created.id
}

// Giong rf-submit khi sua (Luu thay doi) tren the du an trong trang Report ban goc.
export async function renameReportProject(id: string, name: string) {
  await requirePermission("edit")
  await db.project.update({ where: { id }, data: { name } })
  await logAudit("project", "update", name, `Đổi tên dự án thành “${name}” từ trang Báo cáo`)
  revalidatePath("/report")
  revalidatePath("/projects")
}

// Giong data-rdel tren the du an ban goc: xoa ca du an lan toan bo bao cao cua du an do
// (onDelete: Cascade tren ReportRow dam nhan phan xoa reports[pid]).
export async function deleteReportProject(id: string) {
  await requirePermission("delete")
  const existing = await db.project.findUnique({ where: { id } })
  await db.project.delete({ where: { id } })
  await logAudit("project", "delete", existing?.name || id, `Xoá dự án “${existing?.name || id}” từ trang Báo cáo`)
  revalidatePath("/report")
  revalidatePath("/projects")
}

// Port 1:1 hanh vi r-save trong drawEdit() ban goc: readDOM() -> loc bo dong rong toan
// bo cot -> ghi de toan bo reports[pid] -> saveR(). O day ghi de bang xoa het ReportRow
// cua project roi tao lai theo thu tu moi trong 1 transaction.
export async function saveReportRows(projectId: string, rows: ReportRowData[]) {
  await requirePermission("edit")
  const nonEmpty = rows.filter((r) => REPORT_COLUMNS.some((c) => (r[c.key] || "").trim()))
  await db.$transaction([
    db.reportRow.deleteMany({ where: { projectId } }),
    ...nonEmpty.map((r, i) =>
      db.reportRow.create({
        data: {
          projectId,
          position: i,
          testName: r.testName?.trim() || null,
          standard: r.standard?.trim() || null,
          steps: r.steps?.trim() || null,
          criteria: r.criteria?.trim() || null,
          equipment: r.equipment?.trim() || null,
          calibration: r.calibration?.trim() || null,
        },
      })
    ),
  ])
  await logAudit("report" as any, "update", projectId, `Cập nhật bảng báo cáo thử nghiệm (${nonEmpty.length} dòng)`)
  revalidatePath("/report")
}
