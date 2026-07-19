"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { KpiCard } from "@/shared/ui/kpi-card"
import { Pagination } from "@/shared/ui/pagination"
import { useRouter } from "next/navigation"
import { saveProject, deleteProject } from "../actions"
import { PROJECT_STATUS_LABEL, PROJECT_PRIORITY_LABEL, type ProjectRow, type Option } from "../types"

const PAGE_SIZE = 9

const CHIPS: Array<{ id: string; label: string }> = [
  { id: "all", label: "Tất cả" },
  { id: "doing", label: "Đang thực hiện" },
  { id: "done", label: "Hoàn thành" },
  { id: "risk", label: "Có rủi ro" },
]

function statusTone(status: ProjectRow["derivedStatus"]): "neutral" | "info" | "success" | "danger" {
  if (status === "done") return "success"
  if (status === "not_started") return "neutral"
  return "info"
}

function priorityTone(priority: ProjectRow["derivedPriority"]): "neutral" | "warning" | "danger" {
  if (priority === "high") return "danger"
  if (priority === "med") return "warning"
  return "neutral"
}

type ProjectDetailType = "pk-active" | "pk-prog" | "pk-done" | "pk-risk"

export function ProjectsView({ projects, customers, centers }: { projects: ProjectRow[]; customers: Option[]; centers: Option[] }) {
  const router = useRouter()
  const [chip, setChip] = useState("all")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ProjectRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // Bug fix (rà soát lần này): state nay bi thieu hoan toan du 4 KPI card da
  // goi setDetailType/detailType nhung chua tung duoc khai bao - gay loi bien
  // chua dinh nghia, lam crash trang khi bam vao KPI card.
  const [detailType, setDetailType] = useState<ProjectDetailType | null>(null)
  const [pending, startTransition] = useTransition()

  const kpis = useMemo(() => {
    return {
      active: projects.length,
      doing: projects.filter((p) => p.derivedStatus === "doing").length,
      done: projects.filter((p) => p.derivedStatus === "done").length,
      risk: projects.filter((p) => p.risk).length,
    }
  }, [projects])

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (chip === "doing" && p.derivedStatus !== "doing") return false
      if (chip === "done" && p.derivedStatus !== "done") return false
      if (chip === "risk" && !p.risk) return false
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [projects, chip, q])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, safePage])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(p: ProjectRow) { setEditing(p); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      name: String(formData.get("name") || ""),
      customerId: String(formData.get("customerId") || "") || null,
      centerId: String(formData.get("centerId") || "") || null,
      value: formData.get("value") ? Number(formData.get("value")) : null,
      startDate: String(formData.get("startDate") || "") || null,
      endDate: String(formData.get("endDate") || "") || null,
    }
    startTransition(async () => { await saveProject(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteProject(id); setConfirmDeleteId(null) })
  }

  const columns: Array<DataTableColumn<ProjectRow>> = [
    { key: "name", header: "Dự án", render: (p) => <span style={{ fontWeight: 600 }}>{p.name}</span> },
    { key: "customer", header: "Khách hàng", render: (p) => p.customer?.name ?? "—" },
    { key: "center", header: "Trung tâm", render: (p) => p.center?.name ?? "—" },
    { key: "value", header: "Giá trị", align: "right", render: (p) => (p.value != null ? p.value.toLocaleString("vi-VN") : "—") },
    {
      key: "progress",
      header: "Tiến độ",
      render: (p) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 110 }}>
          <div style={{ fontSize: 12 }}>{p.taskDone}/{p.taskTotal} công việc{p.taskOverdue ? ` · ${p.taskOverdue} quá hạn` : ""}</div>
          <div style={{ height: 6, borderRadius: 4, background: "#eef0f3" }}>
            <div style={{ height: 6, borderRadius: 4, width: `${Math.round(p.progress * 100)}%`, background: "#1d5fd6" }} />
          </div>
        </div>
      ),
    },
    { key: "priority", header: "Ưu tiên", render: (p) => <StatusBadge label={PROJECT_PRIORITY_LABEL[p.derivedPriority]} tone={priorityTone(p.derivedPriority)} /> },
    { key: "dueDate", header: "Hạn", render: (p) => (p.dueDate ? new Date(p.dueDate).toLocaleDateString("vi-VN") : "—") },
    { key: "status", header: "Trạng thái", render: (p) => <StatusBadge label={PROJECT_STATUS_LABEL[p.derivedStatus]} tone={statusTone(p.derivedStatus)} /> },
    {
      // Port cua "pplan-link" ban goc (dong 5184, projPlanStats()): bam vao de
      // nhay sang trang Ke hoach thu nghiem da loc theo du an nay.
      key: "plan", header: "Kế hoạch thử nghiệm",
      render: (p) => p.planStats?.hasPlan ? (
        <button
          type="button"
          onClick={() => router.push(`/plan?project=${p.id}`)}
          style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer", padding: 0, textAlign: "left", fontSize: 12.5 }}
        >
          {p.planStats.testCount} bài · {p.planStats.staffCount} nhân viên ›
        </button>
      ) : (
        <span style={{ color: "#9aa1ab", fontSize: 12.5 }}>Chưa có kế hoạch</span>
      ),
    },
    {
      key: "actions", header: "", align: "right",
      render: (p) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => openEdit(p)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteId(p.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button>
        </span>
      ),
    },
  ]

  return (
    <PageShell
      title="Dự án"
      actions={<button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm dự án</button>}
      filters={
        <FilterBar search={{ value: q, onChange: (v) => { setQ(v); setPage(1) }, placeholder: "Tìm dự án..." }}>
          {CHIPS.map((c) => (
            <button key={c.id} type="button" onClick={() => { setChip(c.id); setPage(1) }} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid #dfe3e8", background: chip === c.id ? "#1d5fd6" : "#fff", color: chip === c.id ? "#fff" : "#333", fontSize: 12, cursor: "pointer" }}>{c.label}</button>
          ))}
        </FilterBar>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Dự án đang hoạt động" value={kpis.active} onClick={() => setDetailType("pk-active")} />
        <KpiCard label="Đang thực hiện" value={kpis.doing} tone="warning" onClick={() => setDetailType("pk-prog")} />
        <KpiCard label="Đã hoàn thành" value={kpis.done} tone="success" onClick={() => setDetailType("pk-done")} />
        <KpiCard label="Dự án rủi ro" value={kpis.risk} tone="danger" onClick={() => setDetailType("pk-risk")} />
      </div>

      <DataTable columns={columns} rows={pageItems} rowKey={(p) => p.id} loading={pending} emptyTitle="Chưa có dự án nào" />
      <Pagination page={safePage} pageCount={pageCount} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <FormModal
        open={showForm}
        title={editing ? "Sửa dự án" : "Thêm dự án"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-project-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
      >
        <form id="tf-project-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên dự án *
            <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Khách hàng
              <select name="customerId" defaultValue={editing?.customerId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Trung tâm thử nghiệm
              <select name="centerId" defaultValue={editing?.centerId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Ngày bắt đầu
              <input type="date" name="startDate" defaultValue={editing?.startDate ? editing.startDate.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Ngày kết thúc
              <input type="date" name="endDate" defaultValue={editing?.endDate ? editing.endDate.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Giá trị
            <input name="value" type="number" defaultValue={editing?.value ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <p style={{ fontSize: 12.5, opacity: 0.65, margin: 0 }}>Trạng thái, ưu tiên, tiến độ và hạn hoàn thành được tự động tổng hợp từ các công việc gắn với dự án này.</p>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá dự án?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />

      {detailType && (
        <div
          data-tf-kit="kpi-detail-modal"
          style={{ position: "fixed", inset: 0, background: "rgba(15,18,22,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
          onClick={() => setDetailType(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 20, width: 720, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                {detailType === "pk-active" ? "Tất cả dự án" : detailType === "pk-prog" ? "Dự án đang thực hiện" : detailType === "pk-done" ? "Dự án đã hoàn thành" : "Dự án rủi ro"}
              </div>
              <button type="button" onClick={() => setDetailType(null)} style={{ border: "none", background: "none", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            {(() => {
              const rows = projects.filter((p) => {
                if (detailType === "pk-prog") return p.derivedStatus === "doing"
                if (detailType === "pk-done") return p.derivedStatus === "done"
                if (detailType === "pk-risk") return p.risk
                return true
              })
              if (rows.length === 0) return <div style={{ color: "#8a8f98", fontSize: 13 }}>Không có dự án nào.</div>
              return (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: "1px solid #e6e9ee" }}>
                      <th style={{ padding: "6px 8px" }}>Dự án</th>
                      <th style={{ padding: "6px 8px" }}>Khách hàng</th>
                      <th style={{ padding: "6px 8px" }}>Tiến độ</th>
                      <th style={{ padding: "6px 8px" }}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #f1f2f4" }}>
                        <td style={{ padding: "6px 8px", fontWeight: 600 }}>{p.name}</td>
                        <td style={{ padding: "6px 8px" }}>{p.customer?.name ?? "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{p.taskDone}/{p.taskTotal}</td>
                        <td style={{ padding: "6px 8px" }}><StatusBadge label={PROJECT_STATUS_LABEL[p.derivedStatus]} tone={statusTone(p.derivedStatus)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            })()}
          </div>
        </div>
      )}
    </PageShell>
  )
}

export default ProjectsView
