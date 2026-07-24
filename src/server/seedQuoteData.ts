import { db } from "@/shared/lib/db"
import quoteImportData from "./data/quote-import-data.json"

type CatalogRow = {
  code: string; name: string; standard: string | null; price: number | null; center: string | null; phong: string | null
  group1?: string | null; group2?: string | null; vts?: string | null; standardDays?: number | null
  priceCatarcQc?: number | null; priceIdiadaChina?: number | null; priceIdiadaSpain?: number | null
  priceMira?: number | null; priceCalspan?: number | null; priceImat?: number | null
  estimatedHours?: number | null; machineHours?: number | null; personnelHours?: number | null; gapTiming?: number | null
}
type PersonnelRow = {
  code: string; name: string; prep: number | null; setup: number | null; test: number | null; report: number | null; center: string | null
  group1?: string | null; group2?: string | null; phong?: string | null; vts?: string | null; standard?: string | null
  prepTechHours?: number | null; prepEngHours?: number | null; prepLeadHours?: number | null
  setupTechHours?: number | null; setupEngHours?: number | null; setupLeadHours?: number | null
  testTechHours?: number | null; testEngHours?: number | null; testLeadHours?: number | null
  reportTechHours?: number | null; reportEngHours?: number | null; reportLeadHours?: number | null
}
type MachineRow = {
  code: string; name: string; hourlyRate: number | null; area: number | null; power: number | null; center: string | null
  serialNumber?: string | number | null; depreciationMethod?: string | null; notes?: string | null
  monthlyDepreciationSap?: number | null; costCenterCode?: string | null; gapCheck?: number | null; financeCheckStatus?: string | null
}

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
      group1: c.group1 ?? undefined,
      group2: c.group2 ?? undefined,
      vts: c.vts ?? undefined,
      standardDays: c.standardDays ?? undefined,
      priceCatarcQc: c.priceCatarcQc ?? undefined,
      priceIdiadaChina: c.priceIdiadaChina ?? undefined,
      priceIdiadaSpain: c.priceIdiadaSpain ?? undefined,
      priceMira: c.priceMira ?? undefined,
      priceCalspan: c.priceCalspan ?? undefined,
      priceImat: c.priceImat ?? undefined,
      estimatedHours: c.estimatedHours ?? undefined,
      machineHours: c.machineHours ?? undefined,
      personnelHours: c.personnelHours ?? undefined,
      gapTiming: c.gapTiming ?? undefined,
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
      group1: p.group1 ?? undefined,
      group2: p.group2 ?? undefined,
      phong: p.phong ?? undefined,
      vts: p.vts ?? undefined,
      standard: p.standard ?? undefined,
      prepTechHours: p.prepTechHours != null ? String(p.prepTechHours) : undefined,
      prepEngHours: p.prepEngHours != null ? String(p.prepEngHours) : undefined,
      prepLeadHours: p.prepLeadHours != null ? String(p.prepLeadHours) : undefined,
      setupTechHours: p.setupTechHours != null ? String(p.setupTechHours) : undefined,
      setupEngHours: p.setupEngHours != null ? String(p.setupEngHours) : undefined,
      setupLeadHours: p.setupLeadHours != null ? String(p.setupLeadHours) : undefined,
      testTechHours: p.testTechHours != null ? String(p.testTechHours) : undefined,
      testEngHours: p.testEngHours != null ? String(p.testEngHours) : undefined,
      testLeadHours: p.testLeadHours != null ? String(p.testLeadHours) : undefined,
      reportTechHours: p.reportTechHours != null ? String(p.reportTechHours) : undefined,
      reportEngHours: p.reportEngHours != null ? String(p.reportEngHours) : undefined,
      reportLeadHours: p.reportLeadHours != null ? String(p.reportLeadHours) : undefined,
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

  // 5. Đơn giá thiết bị (Equipment.hourlyRate/area/power) <- sheet "DM MMTB"
  // (334 máy, rà soát lại 24/07 — trước đó chỉ nhập 186/334; 3 mã tài sản SAP dùng
  // chung cho nhiều máy vật lý khác nhau trong file gốc được tách thành *_dup1/2/3
  // để không bị đè dữ liệu khi upsert theo "code").
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
          serialNumber: m.serialNumber != null ? String(m.serialNumber) : undefined,
          depreciationMethod: m.depreciationMethod ?? undefined,
          notes: m.notes ?? undefined,
          monthlyDepreciationSap: m.monthlyDepreciationSap ?? undefined,
          costCenterCode: m.costCenterCode ?? undefined,
          gapCheck: m.gapCheck ?? undefined,
          financeCheckStatus: m.financeCheckStatus ?? undefined,
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
          serialNumber: m.serialNumber != null ? String(m.serialNumber) : undefined,
          depreciationMethod: m.depreciationMethod ?? undefined,
          notes: m.notes ?? undefined,
          monthlyDepreciationSap: m.monthlyDepreciationSap ?? undefined,
          costCenterCode: m.costCenterCode ?? undefined,
          gapCheck: m.gapCheck ?? undefined,
          financeCheckStatus: m.financeCheckStatus ?? undefined,
        },
      })
      machineCreated++
    }
  }
  log.push(`Equipment (DM MMTB): ${machineCreated} created, ${machineUpdated} updated`)

  return log
}
