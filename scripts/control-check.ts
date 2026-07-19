/**
 * control-check.ts — hard gates for architecture + kit + module registry.
 * Exit 1 on any violation. Run in CI and before next build.
 */
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const SRC = path.join(ROOT, "src")
let errors: string[] = []
let warnings: string[] = []

function exists(p: string) {
  return fs.existsSync(path.join(ROOT, p))
}

function walk(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) walk(full, acc)
    else if (/\.(ts|tsx)$/.test(name)) acc.push(full)
  }
  return acc
}

function rel(p: string) {
  return path.relative(ROOT, p).replace(/\\/g, "/")
}

// --- 1. Required tree ---
const requiredPaths = [
  "control/modules.json",
  "control/DECISION.md",
  "control/ACCEPTANCE.md",
  "src/shared/config/nav.ts",
  "src/shared/config/modules.ts",
  "src/shared/lib/db.ts",
  "src/shared/lib/auth.ts",
  "src/shared/lib/rbac.ts",
  "src/shared/ui/page-shell.tsx",
  "src/shared/ui/data-table.tsx",
  "src/shared/ui/form-modal.tsx",
  "src/shared/ui/filter-bar.tsx",
  "src/shared/ui/avatar-initials.tsx",
  "src/shared/ui/kpi-card.tsx",
  "src/shared/ui/status-badge.tsx",
  "src/shared/ui/empty-state.tsx",
  "src/shared/ui/confirm-dialog.tsx",
  "src/app/(app)/layout.tsx",
  "src/app/layout.tsx",
  "prisma/schema.prisma",
]

for (const p of requiredPaths) {
  if (!exists(p)) errors.push(`[missing] ${p}`)
}

// --- 2. modules.json integrity ---
const modulesPath = path.join(ROOT, "control/modules.json")
if (fs.existsSync(modulesPath)) {
  const reg = JSON.parse(fs.readFileSync(modulesPath, "utf8"))
  if (reg.strategy !== "A-big-bang") {
    errors.push(`[registry] strategy must be A-big-bang, got ${reg.strategy}`)
  }
  const ids = new Set<string>()
  for (const m of reg.modules || []) {
    if (ids.has(m.id)) errors.push(`[registry] duplicate module id: ${m.id}`)
    ids.add(m.id)
    if (m.featureDir && m.status === "done") {
      const dir = path.join(ROOT, m.featureDir)
      if (!fs.existsSync(dir)) errors.push(`[done-but-missing-dir] ${m.id}: ${m.featureDir}`)
      for (const f of ["actions.ts", "queries.ts"]) {
        if (!fs.existsSync(path.join(dir, f))) {
          errors.push(`[done-incomplete] ${m.id} missing ${f}`)
        }
      }
    }
  }
  for (const kit of reg.requiredSharedKit || []) {
    const file = path.join(ROOT, "src/shared/ui", `${kit}.tsx`)
    if (!fs.existsSync(file)) errors.push(`[kit-missing] src/shared/ui/${kit}.tsx`)
  }
}

// --- 3. Import boundary scan ---
const featureRoot = path.join(SRC, "features")
const sharedRoot = path.join(SRC, "shared")
const appRoot = path.join(SRC, "app")

const importRe = /from\s+["']([^"']+)["']/g

function featureNameFromFile(file: string): string | null {
  const r = rel(file)
  const m = r.match(/^src\/features\/([^/]+)/)
  return m ? m[1] : null
}

for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, "utf8")
  const r = rel(file)
  let m: RegExpExecArray | null
  importRe.lastIndex = 0
  while ((m = importRe.exec(text))) {
    const spec = m[1]
    // feature -> other feature
    if (r.startsWith("src/features/")) {
      const self = featureNameFromFile(file)
      const toFeat = spec.match(/^@\/features\/([^/]+)/)?.[1]
        || spec.match(/^\.\.\/\.\.\/([^/]+)/)?.[1] // weak
      if (spec.includes("/features/") || spec.startsWith("@/features/")) {
        const target = spec.match(/features\/([^/"']+)/)?.[1]
        if (self && target && target !== self) {
          errors.push(`[import] feature cross-import ${r} -> ${spec}`)
        }
      }
      if (spec.startsWith("@/app") || spec.includes("/app/")) {
        errors.push(`[import] feature must not import app: ${r} -> ${spec}`)
      }
    }
    // shared -> features/app
    if (r.startsWith("src/shared/")) {
      if (spec.startsWith("@/features") || spec.includes("/features/")) {
        errors.push(`[import] shared must not import features: ${r} -> ${spec}`)
      }
      if (spec.startsWith("@/app") || /from\s+["']\.\.\/.*app/.test(text)) {
        if (spec.includes("app/")) errors.push(`[import] shared must not import app: ${r} -> ${spec}`)
      }
    }
  }
}

// --- 4. Fat page guard: page.tsx should stay thin ---
for (const file of walk(appRoot)) {
  if (!file.endsWith("page.tsx")) continue
  const text = fs.readFileSync(file, "utf8")
  const lines = text.split("\n").length
  if (lines > 120) {
    warnings.push(`[fat-page] ${rel(file)} has ${lines} lines (>120). Move logic to features/*`)
  }
  // discourage raw table markup in pages
  if (/<table[\s>]/.test(text) && !rel(file).includes("login")) {
    warnings.push(`[page-table] ${rel(file)} contains <table> — prefer DataTable in feature`)
  }
}

// --- Report ---
console.log("=== TaskFlow v2 control:check ===")
if (warnings.length) {
  console.log("\nWarnings:")
  for (const w of warnings) console.log("  ⚠", w)
}
if (errors.length) {
  console.log("\nErrors:")
  for (const e of errors) console.log("  ✗", e)
  console.log(`\nFAIL — ${errors.length} error(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
console.log(`\nPASS — 0 errors, ${warnings.length} warning(s)`)
