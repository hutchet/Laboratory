import { db } from "@/shared/lib/db"
import quoteImportData from "./data/quote-import-data.json"

type CatalogRow = { code: string; name: string; standard: string | null; price: number | null; center: string | null; phong: string | null }
type PersonnelRow = { code: string; name: string; prep: number | null; setup: number | null; test: number | null; report: number | null; center: string | null }
type MachineRow = { code: string; name: string; hourlyRate: number | null; area: number | null; power: number | null; center: string | null }

type ImportData = {
  catalog: CatalogRow[]
  personnel: PersonnelRow[]
  machines: MachineRow[]
  rates: { techRate: number; engRate: number; leadRate: number; mgrRate: number }
}

const data = quoteImportData as ImportData

// Nguyên tắc phân bổ trung tâm theo "Phòng thử nghiệm" trong file Excel gốc
// (200526_Khung chi phí kiểm thử_final.xlsx).
const CENTER_NAMES = [
  "Trung tâm thử nghiệm pin",
  "Trung tâm thử nghiệm linh kiện",
  "Trung tâm thử nghiệm an toàn xe",
  "Trung tâm thử nghiệm toàn xe",
  "Trung tâm đường thử xe",
]

export async function seedQuoteData() {
  const log: string[] = []

  // 1. Đảm bảo 5 Trung tâm tồn tại (tạo nếu chưa có, không trùng nếu đã có).
  const centerIdByName = new Map<string, string>()
  for (const name of CENTER_NAMES) {
    const existing = await db.center.findFirst({ where: { name } })
    if (existing) {
      centerIdByName.set(name, existing.id)
    } else {
      const created = await db.center.create({ data: { name } })
      centerIdByName.set(name, created.id)
      log.push(`Center created: ${name}`)
    }
  }

  // 2. Danh mục báo giá (TestCatalogItem) <- sheet "DM Bài thử nghiệm"
  const catalogCodes = data.catalog.map((c) => c.code)
  if (catalogCodes.length) {
    await db.testCatalogItem.deleteMany({ where: { code: { in: catalogCodes } } })
  }
  await db.testCatalogItem.createMany({
    data: data.catalog.map((c) => ({
      code: c.code,
      name: c.name,
      standard: c.standard ?? undefined,
      phong: c.phong ?? undefined,
      price: c.price ?? undefined,
      centerId: c.center ? centerIdByName.get(c.center) ?? null : null,
    })),
  })
  log.push(`TestCatalogItem: ${data.catalog.length} rows imported`)

  // 3. Đơn giá nhân sự (PersonnelRouting) <- sheet "Nhân sự"
  const personnelCodes = data.personnel.map((p) => p.code)
  if (personnelCodes.length) {
    await db.personnelRouting.deleteMany({ where: { testCode: { in: personnelCodes } } })
  }
  await db.personnelRouting.createMany({
    data: data.personnel.map((p) => ({
      testCode: p.code,
      testName: p.name,
      prepHours: p.prep != null ? String(p.prep) : undefined,
      setupHours: p.setup != null ? String(p.setup) : undefined,
      testHours: p.test != null ? String(p.test) : undefined,
      reportHours: p.report != null ? String(p.report) : undefined,
      centerId: p.center ? centerIdByName.get(p.center) ?? null : null,
    })),
  })
  log.push(`PersonnelRouting: ${data.personnel.length} rows imported`)

  // 4. Rate nhân sự (PersonnelRateConfig) <- bảng "Rate hour" trong sheet "Nhân sự"
  await db.personnelRateConfig.upsert({
    where: { id: "singleton" },
    update: {
      techRate: data.rates.techRate,
      engRate: data.rates.engRate,
      leadRate: data.rates.leadRate,
      mgrRate: data.rates.mgrRate,
    },
    create: {
      id: "singleton",
      techRate: data.rates.techRate,
      engRate: data.rates.engRate,
      leadRate: data.rates.leadRate,
      mgrRate: data.rates.mgrRate,
    },
  })
  log.push("PersonnelRateConfig updated")

  // 5. Đơn giá thiết bị (Equipment.hourlyRate/area/power) <- sheet "Matrix sử dụng máy"
  let machineCreated = 0
  let machineUpdated = 0
  for (const m of data.machines) {
    const existing = await db.equipment.findUnique({ where: { code: m.code } })
    const centerId = m.center ? centerIdByName.get(m.center) ?? null : null
    if (existing) {
      await db.equipment.update({
        where: { id: existing.id },
        data: {
          hourlyRate: m.hourlyRate ?? undefined,
          area: m.area ?? undefined,
          power: m.power ?? undefined,
          centerId: existing.centerId ?? centerId,
        },
      })
      machineUpdated++
    } else {
      await db.equipment.create({
        data: {
          name: m.name,
          code: m.code,
          hourlyRate: m.hourlyRate ?? undefined,
          area: m.area ?? undefined,
          power: m.power ?? undefined,
          centerId,
        },
      })
      machineCreated++
    }
  }
  log.push(`Equipment (Matrix sử dụng máy): ${machineCreated} created, ${machineUpdated} updated`)

  return log
}
