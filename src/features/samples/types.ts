export type SampleRow = {
  id: string
  code: string | null
  name: string
  serialNumber: string | null
  qty: number | null
  storageLocation: string | null
  customerId: string | null
  projectId: string | null
  sampleGrade: string | null
  group: string | null
  status: string | null // manual override; empty/null = derive automatically
  receivedAt: string | null
  customer: { id: string; name: string } | null
  project: { id: string; name: string } | null
  derivedStatus: string
  doneCount: number
  totalItems: number
  createdAt: Date
}

export type Option = { id: string; name: string }

export const SAMPLE_STATUS_LABEL: Record<string, string> = {
  received: "Mới nhận",
  testing: "Đang thử nghiệm",
  completed: "Hoàn thành",
  returned: "Đã trả/hủy",
}

export const SAMPLE_STATUS_COLOR: Record<string, string> = {
  received: "#9aa1ab",
  testing: "#1d5fd6",
  completed: "#2e9e5b",
  returned: "#c7cbd3",
}

export const SAMPLE_STATUS_ORDER = ["received", "testing", "completed", "returned"]

// Mirrors the original app's sampleAutoStatus(): manual override wins; otherwise
// derive from linked test items (no items => received; all terminal => completed;
// any started => testing; else received).
export function sampleAutoStatus(args: { status: string | null; items: Array<{ result: string | null; actualStart: string | null }> }): string {
  if (args.status) return args.status
  const items = args.items
  if (!items.length) return "received"
  const allDone = items.every((i) => i.result === "pass" || i.result === "fail" || i.result === "cancel")
  if (allDone) return "completed"
  const anyStarted = items.some((i) => !!i.actualStart)
  return anyStarted ? "testing" : "received"
}

export type SampleGroup = {
  project: { id: string; name: string } | null
  customer: { id: string; name: string } | null
  samples: SampleRow[]
}

export function groupSamplesByProject(samples: SampleRow[]): SampleGroup[] {
  const groups: SampleGroup[] = []
  const map = new Map<string, SampleGroup>()
  for (const s of samples) {
    const key = s.project?.id ?? "__none__"
    let g = map.get(key)
    if (!g) {
      g = { project: s.project, customer: s.customer, samples: [] }
      map.set(key, g)
      groups.push(g)
    }
    g.samples.push(s)
  }
  groups.sort((a, b) => (a.project?.name ?? "").localeCompare(b.project?.name ?? ""))
  return groups
}
