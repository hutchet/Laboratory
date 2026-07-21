"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { AddButton } from "@/shared/ui/add-button"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { KpiCard } from "@/shared/ui/kpi-card"
import { IconButton } from "@/shared/ui/icon-button"
import { Perm } from "@/shared/lib/rbac-client"
import { saveSample, deleteSample } from "../actions"
import { SAMPLE_STATUS_LABEL, SAMPLE_STATUS_ORDER, groupSamplesByProject, type SampleRow, type Option } from "../types"

function statusTone(status: string): "neutral" | "info" | "success" | "warning" {
  if (status === "completed") return "success"
  if (status === "testing") return "info"
  if (status === "returned") return "warning"
  return "neutral"
}

export function SamplesView({ samples, customers, projects }: { samples: SampleRow[]; customers: Option[]; projects: Option[] }) {
  const [q, setQ] = useState("")
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editing, setEditing] = useState<SampleRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const kpis = useMemo(() => {
    const total = samples.length
    const testing = samples.filter((s) => s.derivedStatus === "testing").length
    const done = samples.filter((s) => s.derivedStatus === "completed" || s.derivedStatus === "returned").length
    const received = samples.filter((s) => s.derivedStatus === "received").length
    return { total, testing, done, received }
  }, [samples])

  const filtered = useMemo(() => {
    return samples.filter((s) => {
      if (q) {
        const hay = `${s.code ?? s.name} ${s.serialNumber ?? ""} ${s.project?.name ?? ""}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [samples, q])

  const groups = useMemo(() => groupSamplesByProject(filtered), [filtered])

  function toggleGroup(key: string) { setCollapsed((prev) => ({ ...prev, [key]: !prev[key] })) }

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(s: SampleRow) { setEditing(s); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      code: String(formData.get("code") || ""),
      serialNumber: String(formData.get("serialNumber") || ""),
      qty: formData.get("qty") ? Number(formData.get("qty")) : 1,
      storageLocation: String(formData.get("storageLocation") || ""),
      customerId: String(formData.get("customerId") || "") || null,
      projectId: String(formData.get("projectId") || "") || null,
      status: String(formData.get("status") || "") || null,
      receivedAt: String(formData.get("receivedAt") || "") || null,
    }
    startTransition(async () => { await saveSample(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteSample(id); setConfirmDeleteId(null) })
  }

  const columns: Array<DataTableColumn<SampleRow>> = [
    { key: "code", header: "Mã mẫu", render: (s) => <span style={{ fontWeight: 600 }}>{s.code ?? s.name}</span> },
    { key: "serial", header: "Số seri", render: (s) => s.serialNumber ?? "—" },
    { key: "qty", header: "SL", align: "right", render: (s) => s.qty ?? 1 },
    { key: "storageLocation", header: "Vị trí lưu", render: (s) => s.storageLocation ?? "—" },
    { key: "progress", header: "Tiến độ", render: (s) => (s.totalItems ? `${s.doneCount}/${s.totalItems} đạt` : "—") },
    { key: "status", header: "Trạng thái", render: (s) => <StatusBadge label={SAMPLE_STATUS_LABEL[s.derivedStatus] ?? s.derivedStatus} tone={statusTone(s.derivedStatus)} /> },
    {
      key: "actions", header: "", align: "right",
      render: (s) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Perm minPerm="technician">
            <IconButton icon="edit" variant="ghost" size={30} title="Sửa" onClick={() => openEdit(s)} />
            <IconButton icon="delete" variant="danger" size={30} title="Xoá" onClick={() => setConfirmDeleteId(s.id)} />
          </Perm>
        </span>
      ),
    },
  ]

  // Fix thu tu: KPI phai hien TRUOC toolbar/filter (giong Du an/Khach hang/Trung tam) -
  // khong dung props actions/filters cua PageShell nua (thu tu co dinh actions->filters->children
  // luon day KPI xuong duoi toolbar). Chuyen toan bo vao children voi kpis-tier + section-head,
  // dung chung AddButton chuan thay nut bespoke cu.
  return (
    <PageShell title="Quản lý Mẫu">
      <div id="page-samples">
      <div className="kpis-tier" style={{ marginBottom: 20 }}>
        <KpiCard label="Tổng số mẫu" value={kpis.total} />
        <KpiCard label="Đang thử nghiệm" value={kpis.testing} tone="warning" />
        <KpiCard label="Hoàn thành" value={kpis.done} tone="success" />
        <KpiCard label="Mới nhận, chưa xếp lịch" value={kpis.received} tone="danger" />
      </div>
      <div className="section-head">
        <h3>Tất cả mẫu</h3>
        <div className="tools">
          <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm mã mẫu, seri, dự án..." }} />
          <Perm minPerm="technician"><AddButton label="Thêm mẫu" onClick={openNew} /></Perm>
        </div>
      </div>

      {groups.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "#9aa1ab" }}>Chưa có mẫu nào</div>
      ) : (
        groups.map((g, gi) => {
          const key = g.project?.id ?? `__none__${gi}`
          const isCollapsed = !!collapsed[key]
          const totalItems = g.samples.reduce((sum, s) => sum + s.totalItems, 0)
          const totalDone = g.samples.reduce((sum, s) => sum + s.doneCount, 0)
          const pct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0
          return (
            <div key={key} style={{ border: "1px solid #eceff2", borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
              <div
                onClick={() => toggleGroup(key)}
                style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafbfc" }}
              >
                <div>
                  <h3 style={{ fontSize: 15, margin: 0 }}>{g.project ? g.project.name : "Không thuộc dự án nào"}</h3>
                  <span style={{ fontSize: 12, color: "#9aa1ab" }}>{g.customer ? `Khách hàng: ${g.customer.name} · ` : ""}{g.samples.length} mẫu</span>
                </div>
                <div className="sm-progress-surface">
                  <div className="sm-progress-info">
                    <div>Tiến độ</div>
                    <div>{pct}%</div>
                  </div>
                  <div className="pbar" style={{ width: 90, height: 6, background: "#eceff2", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "#1d5fd6" }} />
                  </div>
                  <span className="sm-progress-chevron" style={{ transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform .15s" }}>▾</span>
                </div>
              </div>
              {!isCollapsed && (
                <div style={{ overflowX: "auto" }}>
                  <DataTable columns={columns} rows={g.samples} rowKey={(s) => s.id} loading={pending} emptyTitle="Chưa có mẫu nào" />
                </div>
              )}
            </div>
          )
        })
      )}

      <FormModal
        open={showForm}
        title={editing ? "Sửa mẫu" : "Thêm mẫu"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-sample-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-sample-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Mã mẫu *
            <input name="code" required defaultValue={editing?.code ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số seri
              <input name="serialNumber" defaultValue={editing?.serialNumber ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số lượng
              <input name="qty" type="number" min={1} defaultValue={editing?.qty ?? 1} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Dự án
              <select name="projectId" defaultValue={editing?.projectId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Khách hàng
              <select name="customerId" defaultValue={editing?.customerId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Vị trí lưu
              <input name="storageLocation" defaultValue={editing?.storageLocation ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Ngày nhận
              <input type="date" name="receivedAt" defaultValue={editing?.receivedAt ? editing.receivedAt.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Trạng thái mẫu
            <select name="status" defaultValue={editing?.status ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
              <option value="">— Tự động —</option>
              {SAMPLE_STATUS_ORDER.map((s) => <option key={s} value={s}>{SAMPLE_STATUS_LABEL[s]}</option>)}
            </select>
          </label>
          <div style={{ fontSize: 12, color: "#9aa1ab" }}>Để trống để trạng thái tự suy ra từ tiến độ bài thử liên kết (giống hành vi bản gốc); chỉ chọn thủ công khi cần ghi đè.</div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá mẫu?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      </div>
    </PageShell>
  )
}

export default SamplesView
