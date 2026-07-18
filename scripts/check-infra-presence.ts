/*
 * Infra function presence audit.
 *
 * Purpose: many "đã hoàn thành" infra items in the roadmap turned out to be
 * partially wired (e.g. useColResize claimed for Equipment/Purchase/Auditplan/
 * Quote-matrix but only actually used in 4 Quote sub-pages). This script
 * checks the REAL source tree for each infra item and reports exactly which
 * expected files are missing the wiring, instead of trusting the changelog.
 *
 * Usage:
 *   npx tsx scripts/check-infra-presence.ts
 *   npx tsx scripts/check-infra-presence.ts --json   (machine-readable output)
 *
 * Exit code is non-zero if any REQUIRED check fails. Checks marked
 * status: "tracked-gap" are known-incomplete items and never fail the run;
 * they exist so this script also serves as a live gap list.
 */
import { existsSync, readFileSync } from "fs"
import { join } from "path"

const ROOT = join(__dirname, "..")

function read(path: string): string | null {
  const full = join(ROOT, path)
  if (!existsSync(full)) return null
  try {
    return readFileSync(full, "utf8")
  } catch {
    return null
  }
}

function fileHas(path: string, pattern: string | RegExp): boolean {
  const content = read(path)
  if (content === null) return false
  return typeof pattern === "string" ? content.includes(pattern) : pattern.test(content)
}

type FileCheck = { path: string; pattern?: string | RegExp; label?: string }

type Check = {
  id: string
  label: string
  requiredFiles?: string[] // must exist
  usage?: FileCheck[] // each entry: file must exist AND (if pattern given) must contain it
  severity: "required" | "tracked-gap"
  note?: string
}

const checks: Check[] = [
  {
    id: "escape-close",
    label: "Đóng modal bằng Esc (useEscapeClose)",
    severity: "required",
    requiredFiles: ["lib/useEscapeClose.ts"],
    usage: [
      { path: "app/(app)/plan/PlanClient.tsx", pattern: "useEscapeClose" },
      { path: "app/(app)/auditplan/AuditPlanClient.tsx", pattern: "useEscapeClose" },
      { path: "app/(app)/tasks/TasksClient.tsx", pattern: "useEscapeClose" },
      { path: "app/(app)/equipment/EquipmentClient.tsx", pattern: "useEscapeClose" },
      { path: "app/(app)/purchase/PurchaseClient.tsx", pattern: "useEscapeClose" },
    ],
  },
  {
    id: "audit-log",
    label: "Audit log server-side (logAudit)",
    severity: "required",
    requiredFiles: ["lib/audit.ts"],
    usage: [
      { path: "lib/audit.ts", pattern: /export (async function|const) logAudit/ },
      { path: "app/(app)/tasks/actions.ts", pattern: "logAudit(" },
      { path: "app/(app)/equipment/actions.ts", pattern: "logAudit(" },
      { path: "app/(app)/purchase/actions.ts", pattern: "logAudit(" },
    ],
  },
  {
    id: "rbac",
    label: "RBAC engine trung tâm (rbac.ts + rbac-client.tsx)",
    severity: "required",
    requiredFiles: ["lib/rbac.ts", "lib/rbac-client.tsx"],
    usage: [
      { path: "app/(app)/members/page.tsx", pattern: "rbac" },
      { path: "app/(app)/centers/page.tsx", pattern: "rbac" },
      { path: "app/(app)/customers/page.tsx", pattern: "rbac" },
      { path: "app/(app)/projects/page.tsx", pattern: "rbac" },
      { path: "app/(app)/auditplan/page.tsx", pattern: "rbac" },
    ],
  },
  {
    id: "custom-select",
    label: "Dropdown/select tùy chỉnh (CustomSelect)",
    severity: "tracked-gap",
    note: "Chỉ mới dùng ở TasksClient — cần mở rộng sang các filter dropdown khác.",
    requiredFiles: ["components/CustomSelect.tsx"],
    usage: [
      { path: "app/(app)/tasks/TasksClient.tsx", pattern: "CustomSelect" },
      { path: "app/(app)/projects/ProjectsClient.tsx", pattern: "CustomSelect" },
      { path: "app/(app)/purchase/PurchaseClient.tsx", pattern: "CustomSelect" },
      { path: "app/(app)/equipment/EquipmentClient.tsx", pattern: "CustomSelect" },
    ],
  },
  {
    id: "col-resize",
    label: "Resize cột bảng bằng kéo chuột (useColResize)",
    severity: "tracked-gap",
    note: "Todo ghi 'đã mở rộng sang Equipment/Purchase/Auditplan/Quote-matrix' nhưng thực tế 4 file này KHÔNG import useColResize — chỉ 4 trang Quote (Catalog/Variable/Depreciation/Personnel) có.",
    requiredFiles: ["app/(app)/quote/useColResize.ts"],
    usage: [
      { path: "app/(app)/quote/QuoteCatalogClient.tsx", pattern: "useColResize" },
      { path: "app/(app)/quote/QuoteVariableClient.tsx", pattern: "useColResize" },
      { path: "app/(app)/quote/QuoteDepreciationClient.tsx", pattern: "useColResize" },
      { path: "app/(app)/quote/QuotePersonnelClient.tsx", pattern: "useColResize" },
      { path: "app/(app)/quote/QuoteMatrixClient.tsx", pattern: "useColResize" },
      { path: "app/(app)/equipment/EquipmentClient.tsx", pattern: "useColResize" },
      { path: "app/(app)/purchase/PurchaseClient.tsx", pattern: "useColResize" },
      { path: "app/(app)/auditplan/AuditPlanClient.tsx", pattern: "useColResize" },
    ],
  },
  {
    id: "toolbar-normalize",
    label: "Chuẩn hoá toolbar/nút điều hướng",
    severity: "required",
    usage: [
      { path: "app/(app)/tasks/TasksClient.tsx", pattern: /toolbar/i },
      { path: "app/(app)/purchase/PurchaseClient.tsx", pattern: /toolbar/i },
      { path: "app/(app)/auditplan/AuditPlanClient.tsx", pattern: /toolbar/i },
      { path: "app/(app)/plan/PlanClient.tsx", pattern: /toolbar/i },
      { path: "app/(app)/quality/QualityClient.tsx", pattern: /toolbar/i },
      { path: "app/(app)/samples/SamplesClient.tsx", pattern: /toolbar/i },
    ],
  },
  {
    id: "migration-script",
    label: "Script di trú localStorage → Postgres",
    severity: "required",
    requiredFiles: ["scripts/migrate-localstorage.ts"],
  },
  {
    id: "backup-process-doc",
    label: "Quy trình backup/migration an toàn (PITR)",
    severity: "required",
    requiredFiles: ["BACKUP-MIGRATION-PROCESS.md"],
  },
  {
    id: "canvas-charts",
    label: "Biểu đồ canvas: donut/bubble/Gantt/heatmap dùng chung",
    severity: "tracked-gap",
    note: "Donut hiện làm riêng bằng SVG trong PlanClient/AuditPlanClient — chưa có bubble team hay heatmap; chưa có canvas chart component dùng chung.",
    usage: [
      { path: "components/BubbleChart.tsx" },
      { path: "components/HeatmapChart.tsx" },
    ],
  },
  {
    id: "keyboard-shortcuts",
    label: "Phím tắt bàn phím toàn hệ thống (keydown)",
    severity: "tracked-gap",
    note: "Chỉ có useEscapeClose (đóng modal); chưa có phím tắt mở nhanh (Cmd/Ctrl+K...).",
    usage: [{ path: "lib/useKeyboardShortcuts.ts" }],
  },
  {
    id: "touch-gestures",
    label: "Cử chỉ chạm/kéo mobile (touchstart/touchmove/touchend)",
    severity: "tracked-gap",
    usage: [
      { path: "components/ResponsiveController.tsx", pattern: /touchstart|touchmove|touchend|onTouchStart/ },
    ],
  },
  {
    id: "spotlight-search",
    label: "Tìm kiếm nhanh Spotlight toàn hệ thống",
    severity: "tracked-gap",
    note: "CSS class .spotlight trong dash/page.tsx là widget 'Dự án cần chú ý nhất', KHÔNG phải search toàn hệ thống — đây vẫn là gap thật.",
    usage: [{ path: "components/SpotlightSearch.tsx" }],
  },
  {
    id: "modal-validate",
    label: "Xác thực trạng thái modal (validateModalState)",
    severity: "tracked-gap",
    usage: [{ path: "lib/validateModalState.ts" }],
  },
]

type CheckResult = {
  id: string
  label: string
  severity: Check["severity"]
  ok: boolean
  missingRequiredFiles: string[]
  missingUsage: string[]
  note?: string
}

function runCheck(check: Check): CheckResult {
  const missingRequiredFiles = (check.requiredFiles ?? []).filter((f) => !existsSync(join(ROOT, f)))
  const missingUsage: string[] = []
  for (const u of check.usage ?? []) {
    if (!existsSync(join(ROOT, u.path))) {
      missingUsage.push(`${u.path} (file không tồn tại)`)
      continue
    }
    if (u.pattern && !fileHas(u.path, u.pattern)) {
      missingUsage.push(`${u.path} (thiếu "${u.pattern}")`)
    }
  }
  const ok = missingRequiredFiles.length === 0 && missingUsage.length === 0
  return {
    id: check.id,
    label: check.label,
    severity: check.severity,
    ok,
    missingRequiredFiles,
    missingUsage,
    note: check.note,
  }
}

function main() {
  const asJson = process.argv.includes("--json")
  const results = checks.map(runCheck)

  if (asJson) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    console.log("\n== Infra function presence audit ==\n")
    for (const r of results) {
      const icon = r.ok ? "✅" : r.severity === "tracked-gap" ? "◻ " : "❌"
      console.log(`${icon} [${r.severity}] ${r.label}`)
      if (r.note) console.log(`   note: ${r.note}`)
      for (const f of r.missingRequiredFiles) console.log(`   missing file: ${f}`)
      for (const u of r.missingUsage) console.log(`   missing usage: ${u}`)
    }
    console.log("")
  }

  const failedRequired = results.filter((r) => r.severity === "required" && !r.ok)
  if (failedRequired.length > 0) {
    console.error(`FAIL: ${failedRequired.length} required check(s) failed:`)
    for (const r of failedRequired) console.error(` - ${r.label}`)
    process.exit(1)
  }
  const gaps = results.filter((r) => r.severity === "tracked-gap" && !r.ok)
  if (!asJson && gaps.length > 0) {
    console.log(`(${gaps.length} tracked gap(s) still open — see ◻ items above. These do not fail the build.)`)
  }
  process.exit(0)
}

main()
