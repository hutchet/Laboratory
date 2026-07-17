/**
 * Bước 5 — Script di trú dữ liệu MỘT LẦN từ bản backup localStorage (JSON export
 * do chính nút "⬇ Sao lưu toàn bộ dữ liệu" trong Settings tạo ra) sang Postgres
 * thật qua Prisma.
 *
 * CÁCH DÙNG:
 *   1. Trên trình duyệt đang chạy bản HTML gốc (hoặc bản Next.js mới, trang
 *      Settings), bấm "Sao lưu toàn bộ dữ liệu" để tải file JSON xuất ra.
 *   2. Copy file đó vào server (hoặc máy chạy script này) và đặt đường dẫn
 *      vào biến môi trường EXPORT_FILE, ví dụ:
 *        EXPORT_FILE=/data/backup-2026-07-18.json npx tsx scripts/migrate-localstorage.ts
 *   3. Mặc định script chạy ở chế độ DRY RUN (chỉ in ra số lượng dự kiến ghi,
 *      KHÔNG ghi gì vào DB). Muốn ghi thật, chạy thêm cờ --commit:
 *        EXPORT_FILE=/data/backup-2026-07-18.json npx tsx scripts/migrate-localstorage.ts --commit
 *   4. Sau khi chạy --commit, script tự in bảng đối chiếu số lượng bản ghi
 *      (localStorage key -> số phần tử nguồn / số bản ghi đã tạo trong DB) và
 *      ghi log chi tiết ra migrate-localstorage.log.json cạnh file export.
 *
 * AN TOÀN / NGUYÊN TẮC ADDITIVE-FIRST:
 *   - Script CHỈ tạo mới (upsert theo đúng id gốc), không xoá bất kỳ bản ghi
 *     nào đang có trong Postgres. Chạy lại nhiều lần an toàn (idempotent) vì
 *     dùng upsert theo id gốc từ localStorage.
 *   - Nếu 1 bản ghi nguồn thiếu field bắt buộc (ví dụ Task không có "name"),
 *     script SẼ BỎ QUA bản ghi đó và ghi vào mục "skipped" trong log — không
 *     bao giờ ném lỗi làm dừng cả quá trình vì 1 bản ghi lỗi.
 *   - Chưa chạy thật lần nào trong sandbox này vì sandbox không có kết nối
 *     tới Neon Postgres (không có internet) và cũng chưa có file export JSON
 *     thật để dùng làm input mẫu. Cần chạy script này (qua Hermes AI hoặc
 *     trực tiếp trên máy có mạng) SAU KHI đã lấy được 1 file backup JSON thật
 *     từ trình duyệt đang dùng dữ liệu cũ.
 *
 * GIỚI HẠN ĐÃ BIẾT (đọc kỹ trước khi chạy thật):
 *   - `tf_equipment_centers_v1` (đơn giá điện/thuê theo trung tâm) và một số
 *     field của `tf_purchase_v1` (lab, supplier, task, jira, pr, po, migo,
 *     tinhtrang, tfslink) KHÔNG có cột tương ứng trong schema Prisma hiện tại
 *     (model PurchaseItem chỉ có id/name/quantity/cost/status/note). Để
 *     không mất dữ liệu, script gộp toàn bộ các field dư vào cột `note` dưới
 *     dạng JSON — ĐÂY LÀ GIẢI PHÁP TẠM, nên bổ sung cột thật cho PurchaseItem
 *     (additive migration) rồi viết lại migration để tách ra cột riêng.
 *   - `amount`/`price` trong Purchase là chuỗi định dạng kiểu Việt Nam (VD:
 *     "160.000.000") — script tự parseVnNumber() sang Float, giữ chuỗi gốc
 *     trong `note` JSON để không mất định dạng gốc nếu parse sai.
 */

import { PrismaClient } from "@prisma/client"
import * as fs from "fs"

const prisma = new PrismaClient()
const COMMIT = process.argv.includes("--commit")
const EXPORT_FILE = process.env.EXPORT_FILE

type AnyRec = Record<string, any>

const report: {
  key: string
  sourceCount: number
  writtenCount: number
  skipped: Array<{ reason: string; record: AnyRec }>
}[] = []

function pushReport(
  key: string,
  sourceCount: number,
  writtenCount: number,
  skipped: Array<{ reason: string; record: AnyRec }>,
) {
  report.push({ key, sourceCount, writtenCount, skipped })
}

function parseVnNumber(s: unknown): number | null {
  if (s == null) return null
  if (typeof s === "number") return s
  const cleaned = String(s).replace(/[^0-9.-]/g, "").replace(/\.(?=.*\.)/g, "")
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function toDate(s: unknown): Date | null {
  if (!s) return null
  const d = new Date(String(s))
  return Number.isNaN(d.getTime()) ? null : d
}

async function main() {
  if (!EXPORT_FILE) {
    console.error(
      "Thiếu biến môi trường EXPORT_FILE. Ví dụ: EXPORT_FILE=/data/backup.json npx tsx scripts/migrate-localstorage.ts",
    )
    process.exit(1)
  }
  if (!fs.existsSync(EXPORT_FILE)) {
    console.error(`Không tìm thấy file: ${EXPORT_FILE}`)
    process.exit(1)
  }
  const raw = JSON.parse(fs.readFileSync(EXPORT_FILE, "utf-8")) as AnyRec
  // Chấp nhận cả 2 dạng: file export gốc lồng trong { data: {...} } hoặc phẳng { tf_tasks_v3: [...], ... }
  const data: AnyRec = raw.data && typeof raw.data === "object" ? raw.data : raw

  console.log(`Chế độ: ${COMMIT ? "COMMIT (ghi thật vào DB)" : "DRY RUN (chỉ mô phỏng, không ghi)"}`)

  // ---------- 1. Members (không phụ thuộc bảng khác) ----------
  const members: AnyRec[] = data.tf_members_v3 || []
  let memberWritten = 0
  const memberSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const m of members) {
    if (!m.id || !m.name) {
      memberSkipped.push({ reason: "thiếu id hoặc name", record: m })
      continue
    }
    if (COMMIT) {
      await prisma.member.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          name: m.name,
          code: m.code ?? null,
          role: m.role ?? null,
          gender: m.gender ?? null,
          team: m.team ?? null,
          accessRole: m.admin ?? m.accessRole ?? null,
          email: m.email ?? null,
          phone: m.phone ?? null,
        },
        update: {},
      })
    }
    memberWritten++
  }
  pushReport("tf_members_v3 -> Member", members.length, memberWritten, memberSkipped)

  // ---------- 2. Customers ----------
  const customers: AnyRec[] = data.tf_customers_v1 || []
  let custWritten = 0
  const custSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const c of customers) {
    if (!c.id || !c.name) {
      custSkipped.push({ reason: "thiếu id hoặc name", record: c })
      continue
    }
    if (COMMIT) {
      await prisma.customer.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          name: c.name,
          contact: c.contact ?? null,
          email: c.email ?? null,
          phone: c.phone ?? null,
          address: c.address ?? null,
          value: c.value != null ? Number(c.value) : null,
          notes: c.notes ?? null,
        },
        update: {},
      })
    }
    custWritten++
  }
  pushReport("tf_customers_v1 -> Customer", customers.length, custWritten, custSkipped)

  // ---------- 3. Centers ----------
  const centers: AnyRec[] = data.tf_centers_v1 || []
  let centerWritten = 0
  const centerSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const c of centers) {
    if (!c.id || !c.name) {
      centerSkipped.push({ reason: "thiếu id hoặc name", record: c })
      continue
    }
    if (COMMIT) {
      await prisma.center.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          name: c.name,
          address: c.address ?? null,
          manager: c.manager ?? null,
          phone: c.phone ?? null,
          notes: c.notes ?? null,
        },
        update: {},
      })
    }
    centerWritten++
  }
  pushReport("tf_centers_v1 -> Center", centers.length, centerWritten, centerSkipped)

  // ---------- 4. Projects (cần centers/customers đã có, nhưng bản gốc chỉ có id/name/value nên optional) ----------
  const projectsSrc: AnyRec[] = data.tf_projects_v3 || []
  let projWritten = 0
  const projSkipped: Array<{ reason: string; record: AnyRec }> = []
  const projectIdByName = new Map<string, string>()
  for (const p of projectsSrc) {
    if (!p.id || !p.name) {
      projSkipped.push({ reason: "thiếu id hoặc name", record: p })
      continue
    }
    projectIdByName.set(p.name, p.id)
    if (COMMIT) {
      await prisma.project.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          name: p.name,
          value: p.value != null ? Number(p.value) : null,
          status: p.status ?? null,
          customerId: p.customerId ?? null,
          centerId: p.centerId ?? null,
        },
        update: {},
      })
    }
    projWritten++
  }
  pushReport("tf_projects_v3 -> Project", projectsSrc.length, projWritten, projSkipped)

  // ---------- 5. Tasks (project là TÊN dự án trong bản gốc -> tra ra projectId) ----------
  const tasksSrc: AnyRec[] = data.tf_tasks_v3 || []
  let taskWritten = 0
  const taskSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const t of tasksSrc) {
    if (!t.id || !t.name) {
      taskSkipped.push({ reason: "thiếu id hoặc name", record: t })
      continue
    }
    const projectId = t.project ? projectIdByName.get(t.project) ?? null : null
    if (COMMIT) {
      await prisma.task.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          title: t.name,
          description: t.desc ?? null,
          status: t.status ?? null,
          priority: t.priority ?? null,
          assigneeId: t.owner ?? null,
          projectId,
          dueDate: toDate(t.deadline),
        },
        update: {},
      })
    }
    taskWritten++
  }
  pushReport("tf_tasks_v3 -> Task", tasksSrc.length, taskWritten, taskSkipped)

  // ---------- 6. Equipment ----------
  const equipmentSrc: AnyRec[] = data.tf_equipment_v1 || []
  const centerIdByName = new Map<string, string>()
  for (const c of centers) if (c.id && c.name) centerIdByName.set(c.name, c.id)
  let eqWritten = 0
  const eqSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const e of equipmentSrc) {
    if (!e.id || !e.name) {
      eqSkipped.push({ reason: "thiếu id hoặc name", record: e })
      continue
    }
    if (COMMIT) {
      await prisma.equipment.upsert({
        where: { id: e.id },
        create: {
          id: e.id,
          name: e.name,
          code: e.code ?? null,
          category: e.category ?? null,
          manufacturer: e.manufacturer ?? e.brand ?? null,
          model: e.model ?? null,
          qty: e.qty != null ? Number(e.qty) : null,
          status: e.status ?? null,
          room: e.room ?? null,
          area: e.area != null ? Number(e.area) : null,
          power: e.power != null ? Number(e.power) : null,
          spec: e.spec ?? null,
          centerId: e.center ? centerIdByName.get(e.center) ?? null : null,
        },
        update: {},
      })
    }
    eqWritten++
  }
  pushReport("tf_equipment_v1 -> Equipment", equipmentSrc.length, eqWritten, eqSkipped)

  // ---------- 7. Equipment bookings (date+start/end gộp thành DateTime) ----------
  const bookingsSrc: AnyRec[] = data.tf_eq_bookings_v1 || []
  let bkWritten = 0
  const bkSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const b of bookingsSrc) {
    if (!b.id || !b.equipmentId || !b.date || !b.start || !b.end) {
      bkSkipped.push({ reason: "thiếu id/equipmentId/date/start/end", record: b })
      continue
    }
    const startTime = toDate(`${b.date}T${b.start}:00`)
    const endTime = toDate(`${b.date}T${b.end}:00`)
    if (!startTime || !endTime) {
      bkSkipped.push({ reason: "không parse được ngày giờ", record: b })
      continue
    }
    if (COMMIT) {
      await prisma.equipmentBooking.upsert({
        where: { id: b.id },
        create: {
          id: b.id,
          equipmentId: b.equipmentId,
          startTime,
          endTime,
          bookedBy: b.bookedBy ?? null,
          department: b.dept ?? b.department ?? null,
          purpose: b.purpose ?? null,
        },
        update: {},
      })
    }
    bkWritten++
  }
  pushReport("tf_eq_bookings_v1 -> EquipmentBooking", bookingsSrc.length, bkWritten, bkSkipped)

  // ---------- 8. Test plans + items ----------
  const testPlansSrc: AnyRec[] = data.tf_testplans_v1 || []
  const testItemsSrc: AnyRec[] = data.tf_testitems_v1 || []
  let planWritten = 0
  const planSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const p of testPlansSrc) {
    if (!p.id || !p.projectId) {
      planSkipped.push({ reason: "thiếu id hoặc projectId", record: p })
      continue
    }
    if (COMMIT) {
      await prisma.testPlan.upsert({
        where: { id: p.id },
        create: { id: p.id, projectId: p.projectId, title: p.title ?? null },
        update: {},
      })
    }
    planWritten++
  }
  pushReport("tf_testplans_v1 -> TestPlan", testPlansSrc.length, planWritten, planSkipped)

  let itemWritten = 0
  const itemSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const it of testItemsSrc) {
    if (!it.id || !it.testPlanId || !it.name) {
      itemSkipped.push({ reason: "thiếu id/testPlanId/name", record: it })
      continue
    }
    if (COMMIT) {
      await prisma.testItem.upsert({
        where: { id: it.id },
        create: {
          id: it.id,
          testPlanId: it.testPlanId,
          sampleId: it.sampleId ?? null,
          reportCode: it.reportCode ?? null,
          equipmentId: it.equipmentId ?? null,
          name: it.name,
          priority: it.priority ?? null,
          standard: it.standard ?? null,
          assignee: it.assignee ?? null,
          planStart: toDate(it.planStart),
          planEnd: toDate(it.planEnd),
          actualStart: toDate(it.actualStart),
          actualEnd: toDate(it.actualEnd),
          result: it.result ?? null,
          progress: it.progress != null ? Number(it.progress) : null,
          note: it.note ?? null,
        },
        update: {},
      })
    }
    itemWritten++
  }
  pushReport("tf_testitems_v1 -> TestItem", testItemsSrc.length, itemWritten, itemSkipped)

  // ---------- 9. Audit plans (danh sách kế hoạch, có phases/tasks lồng nhau) ----------
  const auditPlansSrc: AnyRec[] = data.tf_auditplan_list_v1 || []
  let apWritten = 0,
    aphWritten = 0,
    aitWritten = 0
  const apSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const plan of auditPlansSrc) {
    if (!plan.id || !plan.name) {
      apSkipped.push({ reason: "thiếu id hoặc name", record: plan })
      continue
    }
    if (COMMIT) {
      await prisma.auditPlan.upsert({
        where: { id: plan.id },
        create: { id: plan.id, title: plan.name, status: null },
        update: {},
      })
    }
    apWritten++
    let phaseOrder = 0
    for (const phase of plan.phases || []) {
      const phaseId = `${plan.id}-phase-${phase.no ?? phaseOrder}`
      if (COMMIT) {
        await prisma.auditPhase.upsert({
          where: { id: phaseId },
          create: { id: phaseId, auditPlanId: plan.id, name: phase.title ?? String(phase.no ?? ""), order: phaseOrder },
          update: {},
        })
      }
      aphWritten++
      for (const task of phase.tasks || []) {
        const itemId = `${plan.id}-item-${task.no}`
        if (COMMIT) {
          await prisma.auditItem.upsert({
            where: { id: itemId },
            create: {
              id: itemId,
              auditPlanId: plan.id,
              phaseId,
              name: task.name ?? String(task.no ?? ""),
              assignee: task.pic ?? null,
              planStart: toDate(task.start),
              planEnd: toDate(task.end),
              actualStart: toDate(task.astart),
              actualEnd: toDate(task.aend),
              note: task.note ?? task.desc ?? null,
            },
            update: {},
          })
        }
        aitWritten++
      }
      phaseOrder++
    }
  }
  pushReport("tf_auditplan_list_v1 -> AuditPlan", auditPlansSrc.length, apWritten, apSkipped)
  pushReport("tf_auditplan_list_v1[].phases -> AuditPhase", 0, aphWritten, [])
  pushReport("tf_auditplan_list_v1[].phases[].tasks -> AuditItem", 0, aitWritten, [])

  // ---------- 10. Audit log ----------
  const auditLogSrc: AnyRec[] = data.tf_audit_log_v1 || []
  let logWritten = 0
  const logSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const l of auditLogSrc) {
    if (!l.id) {
      logSkipped.push({ reason: "thiếu id", record: l })
      continue
    }
    if (COMMIT) {
      await prisma.auditLog.upsert({
        where: { id: l.id },
        create: { id: l.id, auditPlanId: l.auditPlanId ?? null, note: l.note ?? l.message ?? JSON.stringify(l) },
        update: {},
      })
    }
    logWritten++
  }
  pushReport("tf_audit_log_v1 -> AuditLog", auditLogSrc.length, logWritten, logSkipped)

  // ---------- 11. Purchase (CẢNH BÁO: schema hiện tại thiếu nhiều cột, xem đầu file) ----------
  const purchaseSrc: AnyRec[] = data.tf_purchase_v1 || []
  let pmWritten = 0
  const pmSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const p of purchaseSrc) {
    if (!p.id) {
      pmSkipped.push({ reason: "thiếu id", record: p })
      continue
    }
    const extra = {
      lab: p.lab,
      supplier: p.supplier,
      task: p.task,
      tfs: p.tfs,
      jira: p.jira,
      pr: p.pr,
      po: p.po,
      migo: p.migo,
      tinhtrang: p.tinhtrang,
      pic: p.pic,
      tfslink: p.tfslink,
      amountRaw: p.amount,
      priceRaw: p.price,
    }
    if (COMMIT) {
      await prisma.purchaseItem.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          name: p.name || `(chưa có tên) #${p.no ?? p.id}`,
          quantity: null,
          cost: parseVnNumber(p.amount) ?? parseVnNumber(p.price),
          status: p.status ?? null,
          // Gộp tạm các field chưa có cột riêng vào note dưới dạng JSON — cần bổ
          // sung cột thật cho PurchaseItem rồi tách ra ở migration sau.
          note: JSON.stringify(extra),
        },
        update: {},
      })
    }
    pmWritten++
  }
  pushReport("tf_purchase_v1 -> PurchaseItem (⚠ mapping tạm, xem ghi chú đầu file)", purchaseSrc.length, pmWritten, pmSkipped)

  // ---------- 12. Quality checklist (object dạng {key: true/false}, không phải mảng) ----------
  const qlChecklist: AnyRec = data.tf_ql_checklist_v1 || {}
  let qlWritten = 0
  const qlKeys = Object.keys(qlChecklist)
  for (const key of qlKeys) {
    const id = `ql-${key}`
    if (COMMIT) {
      await prisma.qualityChecklistItem.upsert({
        where: { id },
        create: { id, name: key, done: Boolean(qlChecklist[key]) },
        update: { done: Boolean(qlChecklist[key]) },
      })
    }
    qlWritten++
  }
  pushReport("tf_ql_checklist_v1 -> QualityChecklistItem", qlKeys.length, qlWritten, [])

  // ---------- 13. Quotes thật (tf_quotes) — nếu có, map tối giản vào Quote (không có sub-items vì bản gốc lưu dạng khác) ----------
  const quotesSrc: AnyRec[] = data.tf_quotes || []
  let quoteWritten = 0
  const quoteSkipped: Array<{ reason: string; record: AnyRec }> = []
  for (const q of quotesSrc) {
    if (!q.id) {
      quoteSkipped.push({ reason: "thiếu id", record: q })
      continue
    }
    if (COMMIT) {
      await prisma.quote.upsert({
        where: { id: q.id },
        create: {
          id: q.id,
          title: q.title || q.name || `Báo giá #${q.id}`,
          code: q.code ?? null,
          customerId: q.customerId ?? null,
          projectId: q.projectId ?? null,
          status: q.status ?? null,
          totalAmount: q.totalAmount != null ? Number(q.totalAmount) : null,
        },
        update: {},
      })
    }
    quoteWritten++
  }
  pushReport("tf_quotes -> Quote (tối giản, chưa gồm sub-items)", quotesSrc.length, quoteWritten, quoteSkipped)

  // ---------- In báo cáo đối chiếu ----------
  console.log("\n================ ĐỐI CHIẾU SỐ LƯỢNG BẢN GHI ================")
  for (const r of report) {
    const mismatch = r.sourceCount !== r.writtenCount && r.sourceCount > 0
    console.log(
      `${mismatch ? "⚠ " : "✓ "}${r.key}: nguồn=${r.sourceCount} | ${COMMIT ? "đã ghi" : "sẽ ghi"}=${r.writtenCount} | bỏ qua=${r.skipped.length}`,
    )
  }
  const logPath = EXPORT_FILE.replace(/\.json$/, "") + ".migrate-log.json"
  fs.writeFileSync(logPath, JSON.stringify({ commit: COMMIT, report }, null, 2), "utf-8")
  console.log(`\nĐã ghi log chi tiết (bao gồm toàn bộ bản ghi bị bỏ qua và lý do) vào: ${logPath}`)
  if (!COMMIT) {
    console.log("\nĐây là DRY RUN — chưa ghi gì vào Postgres. Chạy lại với --commit để ghi thật.")
  }
}

main()
  .catch((e) => {
    console.error("Lỗi không mong đợi:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
