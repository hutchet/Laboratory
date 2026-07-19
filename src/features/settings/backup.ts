import { db } from "@/shared/lib/db"

// Danh sách các model nghiệp vụ được sao lưu/khôi phục/xoá toàn bộ — KHÔNG bao gồm
// các model xác thực người dùng (User/Account/Session/VerificationToken/Role/Permission/
// UserRole): bản HTML gốc không có hệ thống đăng nhập nhiều người dùng nên các model đó
// không thuộc phạm vi "toàn bộ dữ liệu" của doFullBackup()/doFullRestore()/set-clear-btn
// gốc; đưa auth vào đây sẽ có rủi ro tự đăng xuất/tự xoá tài khoản đang dùng. Thứ
// tự dưới đây là PARENT-FIRST (dùng để khôi phục/tạo); khi xoá sẽ dùng thứ tự ngược
// lại (CHILD-FIRST) để không vi phạm khoá ngoại.
export type TableKey =
  | "centers"
  | "customers"
  | "members"
  | "projects"
  | "tasks"
  | "reportRows"
  | "equipment"
  | "equipmentBookings"
  | "quotes"
  | "quoteCatalogItems"
  | "quoteMatrixItems"
  | "quotePersonnelItems"
  | "quoteDepreciationItems"
  | "quoteVariableItems"
  | "testCatalogItems"
  | "personnelRateConfigs"
  | "personnelRoutings"
  | "depreciationAssets"
  | "variableCosts"
  | "auditPlans"
  | "auditPhases"
  | "auditItems"
  | "auditLogs"
  | "purchaseItems"
  | "samples"
  | "testPlans"
  | "testPacks"
  | "testItems"
  | "qualityChecklistStates"

type TableSpec = { key: TableKey; dateFields: string[] }

export const BACKUP_TABLE_ORDER: TableSpec[] = [
  { key: "centers", dateFields: [] },
  { key: "customers", dateFields: [] },
  { key: "members", dateFields: ["createdAt", "updatedAt"] },
  { key: "projects", dateFields: ["startDate", "endDate", "createdAt", "updatedAt"] },
  { key: "tasks", dateFields: ["dueDate", "createdAt", "updatedAt"] },
  { key: "reportRows", dateFields: ["createdAt", "updatedAt"] },
  { key: "equipment", dateFields: ["calLast"] },
  { key: "equipmentBookings", dateFields: ["startTime", "endTime", "createdAt"] },
  { key: "quotes", dateFields: ["quoteDate", "createdAt", "updatedAt"] },
  { key: "quoteCatalogItems", dateFields: [] },
  { key: "quoteMatrixItems", dateFields: [] },
  { key: "quotePersonnelItems", dateFields: [] },
  { key: "quoteDepreciationItems", dateFields: [] },
  { key: "quoteVariableItems", dateFields: [] },
  { key: "testCatalogItems", dateFields: ["createdAt"] },
  { key: "personnelRateConfigs", dateFields: [] },
  { key: "personnelRoutings", dateFields: ["createdAt"] },
  { key: "depreciationAssets", dateFields: ["createdAt"] },
  { key: "variableCosts", dateFields: ["createdAt"] },
  { key: "auditPlans", dateFields: ["scheduledAt"] },
  { key: "auditPhases", dateFields: [] },
  { key: "auditItems", dateFields: ["planStart", "planEnd", "actualStart", "actualEnd"] },
  { key: "auditLogs", dateFields: ["createdAt"] },
  { key: "purchaseItems", dateFields: [] },
  { key: "samples", dateFields: ["receivedAt", "createdAt"] },
  { key: "testPlans", dateFields: ["createdAt", "updatedAt"] },
  { key: "testPacks", dateFields: ["createdAt", "updatedAt"] },
  { key: "testItems", dateFields: ["planStart", "planEnd", "actualStart", "actualEnd", "createdAt", "updatedAt"] },
  { key: "qualityChecklistStates", dateFields: [] },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function delegateFor(key: TableKey): any {
  const map: Record<TableKey, any> = {
    centers: db.center,
    customers: db.customer,
    members: db.member,
    projects: db.project,
    tasks: db.task,
    reportRows: db.reportRow,
    equipment: db.equipment,
    equipmentBookings: db.equipmentBooking,
    quotes: db.quote,
    quoteCatalogItems: db.quoteCatalogItem,
    quoteMatrixItems: db.quoteMatrixItem,
    quotePersonnelItems: db.quotePersonnelItem,
    quoteDepreciationItems: db.quoteDepreciationItem,
    quoteVariableItems: db.quoteVariableItem,
    testCatalogItems: db.testCatalogItem,
    personnelRateConfigs: db.personnelRateConfig,
    personnelRoutings: db.personnelRouting,
    depreciationAssets: db.depreciationAsset,
    variableCosts: db.variableCost,
    auditPlans: db.auditPlan,
    auditPhases: db.auditPhase,
    auditItems: db.auditItem,
    auditLogs: db.auditLog,
    purchaseItems: db.purchaseItem,
    samples: db.sample,
    testPlans: db.testPlan,
    testPacks: db.testPack,
    testItems: db.testItem,
    qualityChecklistStates: db.qualityChecklistState,
  }
  return map[key]
}

export type FullBackup = {
  version: 1
  exportedAt: string
  tables: Partial<Record<TableKey, Record<string, unknown>[]>>
}

// Giởng eqBackupData()/doFullBackup() (dòng 6784 bản gốc): đọc toàn bộ dữ liệu nghiệp
// vụ, đóng gói thành 1 object JSON để phía client tải xuống thành file .json.
export async function exportFullBackup(): Promise<FullBackup> {
  const tables: FullBackup["tables"] = {}
  for (const t of BACKUP_TABLE_ORDER) {
    tables[t.key] = await delegateFor(t.key).findMany()
  }
  return { version: 1, exportedAt: new Date().toISOString(), tables }
}

// Giởng #set-clear-btn (bản gốc): xoá TOÀN BỘ dữ liệu nghiệp vụ. Xoá theo thứ tự
// con-trước-cha-sau để không vi phạm khoá ngoại.
export async function wipeAllBusinessData(): Promise<void> {
  const reversed = [...BACKUP_TABLE_ORDER].reverse()
  for (const t of reversed) {
    await delegateFor(t.key).deleteMany({})
  }
}

function reviveDates(row: Record<string, unknown>, dateFields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row }
  for (const f of dateFields) {
    if (out[f]) out[f] = new Date(out[f] as string)
  }
  return out
}

// Giởng doFullRestore() (dòng 6793 bản gốc): THAY THẾ toàn bộ dữ liệu hiện tại bằng
// dữ liệu trong file backup. Xoá hết trước (con->cha), rồi tạo lại theo thứ tự
// cha->con, giự nguyên id gốc trong file backup để bảo toàn quan hệ giỏa các bảng.
export async function importFullBackup(data: FullBackup): Promise<Record<string, number>> {
  await wipeAllBusinessData()
  const counts: Record<string, number> = {}
  for (const t of BACKUP_TABLE_ORDER) {
    const rows = data.tables?.[t.key]
    if (!Array.isArray(rows) || !rows.length) {
      counts[t.key] = 0
      continue
    }
    const revived = rows.map((r) => reviveDates(r as Record<string, unknown>, t.dateFields))
    await delegateFor(t.key).createMany({ data: revived, skipDuplicates: true })
    counts[t.key] = revived.length
  }
  return counts
}
