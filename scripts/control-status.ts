/** Pretty-print module registry status */
import fs from "node:fs"
import path from "node:path"

const reg = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "control/modules.json"), "utf8"),
)

const byStatus: Record<string, number> = {}
for (const m of reg.modules) {
  byStatus[m.status] = (byStatus[m.status] || 0) + 1
}

console.log("TaskFlow v2 — module status")
console.log("Strategy:", reg.strategy)
console.log("Summary:", byStatus)
console.log("")
console.log(
  "ID".padEnd(14),
  "PHASE".padEnd(6),
  "STATUS".padEnd(12),
  "ROUTE".padEnd(28),
  "TITLE",
)
console.log("-".repeat(90))
for (const m of reg.modules) {
  console.log(
    String(m.id).padEnd(14),
    String(m.phase || "-").padEnd(6),
    String(m.status).padEnd(12),
    String(m.route || "-").padEnd(28),
    m.title,
  )
}

const core = reg.gates.core.requiredModuleIds
const done = new Set(reg.modules.filter((m: any) => m.status === "done").map((m: any) => m.id))
const coreLeft = core.filter((id: string) => !done.has(id))
console.log("\nGate core:", coreLeft.length === 0 ? "PASS" : `BLOCKED (${coreLeft.join(", ")})`)
