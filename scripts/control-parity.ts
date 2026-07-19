/** List parity checklist coverage vs html pages */
import fs from "node:fs"
import path from "node:path"

const ROOT = process.cwd()
const reg = JSON.parse(fs.readFileSync(path.join(ROOT, "control/modules.json"), "utf8"))
const parityDir = path.join(ROOT, "docs/parity")

console.log("Parity checklist coverage\n")
for (const m of reg.modules) {
  if (!m.htmlPages?.length) continue
  const file = path.join(parityDir, `${m.id}.md`)
  const has = fs.existsSync(file)
  console.log(
    `${has ? "✓" : "○"} ${m.id.padEnd(12)} html=[${m.htmlPages.join(", ")}] checklist=${has ? "yes" : "MISSING"}`,
  )
}
