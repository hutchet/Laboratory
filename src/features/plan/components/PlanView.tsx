"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { CustomSelect } from '@/shared/ui/custom-select'
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { KpiCard } from "@/shared/ui/kpi-card"
import { GanttChart } from "./GanttChart"
import { DonutSvg } from "@/shared/ui/donut-svg"
import { Perm } from "@/shared/lib/rbac-client"
import { saveTestItem, deleteTestItem, saveTestPack, deleteTestPack } from "../actions"
import { RESULT_LABEL, RESULT_COLOR, autoStatus, isOverdue, type TestItemRow, type TestPackRow, type TestPlanRow, type Option } from "../types"

// Port cua renderPlanOverview() ban goc (dong 7022-7043): 2 donut rieng
// (theo trang thai tu dong: ongoing/queuing/delay/cancel, va theo ket qua
// tuong minh: pass/fail).
const PLAN_STATUS_DONUT_KEYS = ["ongoing", "queuing", "delay", "cancel"] as const
const PLAN_RESULT_DONUT_KEYS = ["pass", "fail"] as const

// Port cua downloadCsv() dung o AuditPlanView/TasksView/PurchaseView (nut
// "Xuat Excel" ban goc thuc chat la xuat .csv qua Blob, giu dung ky thuat).
function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function resultTone(status: string): "neutral" | "success" | "danger" | "warning" {
  if (status === "pass") return "success"
  if (status === "fail" || status === "delay") return "danger"
  if (status === "ongoing") return "warning"
  return "neutral"
}

export function PlanView({
  items, packs, plans, projects, samples, equipmentOptions, memberOptions, initialProjectFilter,
}: {
  items: TestItemRow[]; packs: TestPackRow[]; plans: TestPlanRow[]; projects: Option[]; samples: Option[]; equipmentOptions: Option[]; memberOptions: Option[]; initialProjectFilter?: string
}) {
  const [q, setQ] = useState("")
  // Port cua data-goto-plan ban goc (dong 6493-6495): cho phep nhay toi day
  // tu trang Du an da loc san theo ?project=<id>.
  const [projectFilter, setProjectFilter] = useState(initialProjectFilter || "")
  const [editing, setEditing] = useState<TestItemRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showPackForm, setShowPackForm] = useState(false)
  const [confirmDeletePackId, setConfirmDeletePackId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const scopedItems = useMemo(
    () => items.filter((it) => !projectFilter || it.testPlan?.project?.id === projectFilter),
    [items, projectFilter],
  )
  const scopedPacks = useMemo(() => {
    const planIds = new Set(plans.filter((p) => !projectFilter || p.projectId === projectFilter).map((p) => p.id))
    return packs.filter((p) => planIds.has(p.testPlanId))
  }, [packs, plans, projectFilter])

  const filtered = useMemo(
    () => scopedItems.filter((it) => !q || it.name.toLowerCase().includes(q.toLowerCase())),
    [scopedItems, q],
  )

  // Overview KPIs (mirrors renderPlanOverview: totals, avg progress, status breakdown, overdue count).
  const kpi = useMemo(() => {
    const total = scopedItems.length
    const done = scopedItems.filter((it) => it.result === "pass").length
    const overdue = scopedItems.filter((it) => isOverdue(it)).length
    const avgProgress = total ? Math.round(scopedItems.reduce((s, it) => s + (it.progress || 0), 0) / total) : 0
    const byStatus: Record<string, number> = {}
    scopedItems.forEach((it) => { const s = autoStatus(it); byStatus[s] = (byStatus[s] || 0) + 1 })
    return { total, done, overdue, avgProgress, byStatus }
  }, [scopedItems])

  const statusDonutSegments = useMemo(
    () => PLAN_STATUS_DONUT_KEYS.map((k) => ({ key: k, value: kpi.byStatus[k] || 0, color: RESULT_COLOR[k] })).filter((s) => s.value > 0),
    [kpi.byStatus],
  )
  const resultDonutSegments = useMemo(
    () => PLAN_RESULT_DONUT_KEYS.map((k) => ({ key: k, value: kpi.byStatus[k] || 0, color: RESULT_COLOR[k] })).filter((s) => s.value > 0),
    [kpi.byStatus],
  )

  // Muc con thieu theo checklist: "bieu do khoi luong theo PIC dang bar rieng",
  // port dung mau voi workload cua AuditPlanView (Khoi luong theo phu trach).
  const workload = useMemo(() => {
    const map = new Map<string, number>()
    scopedItems.forEach((it) => {
      const key = it.pic?.name || it.assignee || "Chưa gán"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [scopedItems])
  const maxWorkload = Math.max(1, ...workload.map(([, n]) => n))

  function exportCsv() {
    const header = ["Bài thử", "Dự án", "Mẫu", "Tiêu chuẩn", "Phụ trách", "KH bắt đầu", "KH kết thúc", "TT bắt đầu", "TT kết thúc", "Tiến độ", "Kết quả"]
    const rows = filtered.map((it) => [
      it.name,
      it.testPlan?.project?.name ?? "",
      packs.find((p) => p.id === it.packId)?.code ?? "",
      it.standard ?? "",
      it.pic?.name ?? it.assignee ?? "",
      it.planStart ? it.planStart.slice(0, 10) : "",
      it.planEnd ? it.planEnd.slice(0, 10) : "",
      it.actualStart ? it.actualStart.slice(0, 10) : "",
      it.actualEnd ? it.actualEnd.slice(0, 10) : "",
      it.progress != null ? `${it.progress}%` : "",
      RESULT_LABEL[autoStatus(it)] ?? "",
    ])
    downloadCsv("ke-hoach-thu-nghiem.csv", [header, ...rows])
  }

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: TestItemRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      projectId: String(formData.get("projectId") || "") || undefined,
      packId: String(formData.get("packId") || "") || null,
      name: String(formData.get("name") || ""),
      reportCode: String(formData.get("reportCode") || ""),
      priority: String(formData.get("priority") || ""),
      standard: String(formData.get("standard") || ""),
      picId: String(formData.get("picId") || "") || null,
      result: String(formData.get("result") || ""),
      progress: formData.get("progress") ? Number(formData.get("progress")) : null,
      sampleId: String(formData.get("sampleId") || "") || null,
      equipmentId: String(formData.get("equipmentId") || "") || null,
      planStart: String(formData.get("planStart") || "") || null,
      planEnd: String(formData.get("planEnd") || "") || null,
      actualStart: String(formData.get("actualStart") || "") || null,
      actualEnd: String(formData.get("actualEnd") || "") || null,
    }
    startTransition(async () => { await saveTestItem(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteTestItem(id); setConfirmDeleteId(null) })
  }
  function handlePackSubmit(formData: FormData) {
    const input = {
      projectId: String(formData.get("projectId") || "") || undefined,
      code: String(formData.get("code") || ""),
      serial: String(formData.get("serial") || "") || null,
      qty: formData.get("qty") ? Number(formData.get("qty")) : 1,
    }
    startTransition(async () => { await saveTestPack(input); setShowPackForm(false) })
  }
  function confirmDeletePack() {
    if (!confirmDeletePackId) return
    const id = confirmDeletePackId
    startTransition(async () => { await deleteTestPack(id); setConfirmDeletePackId(null) })
  }

  const columns: Array<DataTableColumn<TestItemRow>> = [
    { key: "name", header: "Bài thử", render: (it) => <span style={{ fontWeight: 600 }}>{it.name}</span> },
    { key: "project", header: "Dự án", render: (it) => it.testPlan?.project?.name ?? "—" },
    { key: "pack", header: "Mẫu", render: (it) => packs.find((p) => p.id === it.packId)?.code ?? "—" },
    { key: "standard", header: "Tiêu chuẩn", render: (it) => it.standard ?? "—" },
    { key: "pic", header: "Phụ trách", render: (it) => it.pic?.name ?? it.assignee ?? "—" },
    { key: "planStart", header: "Kế hoạch", render: (it) => it.planStart ? `${it.planStart.slice(0, 10)} → ${it.planEnd?.slice(0, 10) ?? "—"}` : "—" },
    { key: "actual", header: "Thực tế", render: (it) => it.actualStart ? `${it.actualStart.slice(0, 10)} → ${it.actualEnd?.slice(0, 10) ?? "—"}` : "—" },
    { key: "progress", header: "Tiến đứ", align: "right", render: (it) => (it.progress != null ? `${it.progress}%` : "—") },
    { key: "result", header: "Kết quả", render: (it) => { const s = autoStatus(it); return <StatusBadge label={RESULT_LABEL[s] ?? s} tone={resultTone(s)} /> } },
    {
      key: "actions", header: "", align: "right",
      render: (it) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => openEdit(it)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteId(it.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button>
        </span>
      ),
    },
  ]

  return (
    <PageShell
      title="Kế hoạch thử nghiệm"
      actions={(
        <span style={{ display: "flex", gap: 8 }}>
          <Perm minPerm="manager"><button type="button" onClick={() => setShowPackForm(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1d5fd6", background: "#fff", color: "#1d5fd6" }}>+ Mẫu</button></Perm>
          <button type="button" onClick={exportCsv} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff", color: "#1b1f24" }}>Xuất Excel</button>
          <button type="button" onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff", color: "#1b1f24" }}>Xuất PDF</button>
          <button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm bài thử</button>
        </span>
      )}
      filters={(
        <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm bài thử..." }}>
          <CustomSelect
            value={projectFilter}
            onChange={setProjectFilter}
            options={[{value:"",label:"Tất cả dự án"},...projects.map(p=>({value:p.id,label:p.name}))]}
            width={200}
          />
        </FilterBar>
      )}
    >
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <KpiCard label="Tổng bài thử" value={kpi.total} />
        <KpiCard label="Đảt" value={kpi.done} tone="success" />
        <KpiCard label="Tiến độ TB" value={`${kpi.avgProgress}%`} />
        <KpiCard label="Quá hạn" value={kpi.overdue} tone={kpi.overdue > 0 ? "danger" : "neutral"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <DonutSvg size={100} segments={statusDonutSegments.map((s) => ({ value: s.value, color: s.color }))} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#444" }}>Phân bố theo trạng thái</div>
            {PLAN_STATUS_DONUT_KEYS.map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: RESULT_COLOR[k], display: "inline-block" }} />
                {RESULT_LABEL[k]}: <b>{kpi.byStatus[k] || 0}</b>
              </div>
            ))}
          </div>
        </div>
        <div style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: 16, display: "flex", alignItems: "center", gap: 16 }}>
          <DonutSvg size={100} segments={resultDonutSegments.map((s) => ({ value: s.value, color: s.color }))} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#444" }}>Phân bố theo kết quả</div>
            {PLAN_RESULT_DONUT_KEYS.map((k) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 3 }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: RESULT_COLOR[k], display: "inline-block" }} />
                {RESULT_LABEL[k]}: <b>{kpi.byStatus[k] || 0}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#444" }}>Biểu đồ Gantt</div>
          <GanttChart items={filtered} packs={scopedPacks} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#444" }}>Khối lượng theo PIC</div>
          <div style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {workload.length === 0 && <div style={{ color: "#8a8f98", fontSize: 13 }}>Chưa có dữ liệu.</div>}
            {workload.map(([name, count]) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span>{name}</span><span style={{ fontWeight: 600 }}>{count}</span>
                </div>
                <div style={{ background: "#eef1f5", borderRadius: 4, height: 6 }}>
                  <div style={{ background: "#1d5fd6", borderRadius: 4, height: 6, width: `${(count / maxWorkload) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có bài thử nào" />

      <FormModal
        open={showForm}
        title={editing ? "Sửa bài thử" : "Thêm bài thử"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-plan-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form id="tf-plan-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên bài thử *
            <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          {!editing && (
            <label style={{ fontSize: 12, fontWeight: 600 }}>Dự án *
              <select name="projectId" required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mẫu
              <select name="packId" defaultValue={editing?.packId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {packs.map((p) => <option key={p.id} value={p.id}>{p.code}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mẫu thử (sample)
              <select name="sampleId" defaultValue={editing?.sampleId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {samples.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Thiết bị
              <select name="equipmentId" defaultValue={editing?.equipmentId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {equipmentOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Phụ trách
              <select name="picId" defaultValue={editing?.picId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {memberOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Tiêu chuẩn
              <input name="standard" defaultValue={editing?.standard ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Kết quả
              <select name="result" defaultValue={editing?.result ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">(tự động)</option>
                <option value="pass">Đạt</option>
                <option value="fail">Không đạt</option>
                <option value="cancel">Hủy</option>
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Kế hoạch bắt đầu
              <input type="date" name="planStart" defaultValue={editing?.planStart ? editing.planStart.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Kế hoạch kết thúc
              <input type="date" name="planEnd" defaultValue={editing?.planEnd ? editing.planEnd.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Thực tế bắt đầu
              <input type="date" name="actualStart" defaultValue={editing?.actualStart ? editing.actualStart.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Thực tế kết thúc
              <input type="date" name="actualEnd" defaultValue={editing?.actualEnd ? editing.actualEnd.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tiến độ (%)
            <input type="number" min={0} max={100} name="progress" defaultValue={editing?.progress ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
        </form>
      </FormModal>

      <FormModal
        open={showPackForm}
        title="Thêm mẫu"
        onClose={() => setShowPackForm(false)}
        onSubmit={() => { const f = document.getElementById("tf-pack-form") as HTMLFormElement | null; if (f) handlePackSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form id="tf-pack-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Dự án *
            <select name="projectId" required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
              <option value="">—</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Mã mẫu *
            <input name="code" required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số seri
              <input name="serial" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số lượng
              <input type="number" min={1} name="qty" defaultValue={1} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
        </form>
      </FormModal>

      {scopedPacks.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#444" }}>Quản lý mẫu</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {scopedPacks.map((p) => {
              const packItems = items.filter((it) => it.packId === p.id)
              const done = packItems.filter((it) => it.result === "pass").length
              return (
                <div key={p.id} style={{ border: "1px solid #e2e5e9", borderRadius: 10, padding: 12, minWidth: 200, display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Mẫu {p.code}</div>
                    <div style={{ fontSize: 12, color: "#8a8f98" }}>S/N: {p.serial ?? "—"} · SL: {p.qty ?? 1} · {done}/{packItems.length} đạt</div>
                  </div>
                  <Perm minPerm="manager"><button type="button" onClick={() => setConfirmDeletePackId(p.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer", fontSize: 12 }}>Xoá</button></Perm>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Xoá bài thử"
        description="Bạn có chắc muốn xoá bài thử này?"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        danger
      />
      <ConfirmDialog
        open={!!confirmDeletePackId}
        title="Xoá mẫu"
        description="Xoá mẫu này sẽ xoá tất cả bài thử liên quan. Tiếp tục?"
        onCancel={() => setConfirmDeletePackId(null)}
        onConfirm={confirmDeletePack}
        danger
      />
    </PageShell>
  )
}
