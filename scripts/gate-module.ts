/**
 * gate-module.ts
 * Usage:
 *   npx tsx scripts/gate-module.ts tasks
 *   npx tsx scripts/gate-module.ts core
 *   npx tsx scripts/gate-module.ts full
 */
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"

const ROOT = process.cwd()
const target = process.argv[2]
if (!target) {
  console.error("Usage: gate-module <moduleId|core|full>")
  process.exit(2)
}

const reg = JSON.parse(fs.readFileSync(path.join(ROOT, "control/modules.json"), "utf8"))

function checkModule(id: string): string[] {
  const errs: string[] = []
  const m = reg.modules.find((x: any) => x.id === id)
  if (!m) return [`unknown module: ${id}`]
  if (m.status !== "done") errs.push(`${id}: status is '${m.status}', need 'done'`)
  if (m.featureDir) {
    const dir = path.join(ROOT, m.featureDir)
    if (!fs.existsSync(dir)) errs.push(`${id}: missing dir ${m.featureDir}`)
    else {
      for (const f of ["actions.ts", "queries.ts"]) {
        if (!fs.existsSync(path.join(dir, f))) errs.push(`${id}: missing ${f}`)
      }
      const comps = path.join(dir, "components")
      if (!fs.existsSync(comps) || fs.readdirSync(comps).length === 0) {
        errs.push(`${id}: components/ empty`)
      }
    }
  }
  if (m.route) {
    // map route to app page roughly
    const seg = m.route.replace(/^\//, "").split("?")[0]
    const page = path.join(ROOT, "src/app/(app)", seg, "page.tsx")
    if (!fs.existsSync(page)) errs.push(`${id}: missing page ${path.relative(ROOT, page)}`)
  }
  return errs
}

// always run architecture check first
const chk = spawnSync("npx", ["tsx", "scripts/control-check.ts"], {
  cwd: ROOT,
  encoding: "utf8",
  shell: process.platform === "win32",
})
process.stdout.write(chk.stdout || "")
process.stderr.write(chk.stderr || "")
if (chk.status !== 0) {
  console.error("\nGATE FAIL — control:check failed")
  process.exit(1)
}

let ids: string[] = []
if (target === "core") ids = reg.gates.core.requiredModuleIds
else if (target === "full") ids = reg.gates.full.requiredModuleIds
else ids = [target]

const allErrs = ids.flatMap(checkModule)
if (allErrs.length) {
  console.error("\nGATE FAIL")
  for (const e of allErrs) console.error("  ✗", e)
  process.exit(1)
}
console.log(`\nGATE PASS — ${target}`)
