"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { AddButton } from "@/shared/ui/add-button"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { KpiCard } from "@/shared/ui/kpi-card"
import { IconButton } from "@/shared/ui/icon-button"
import { CustomSelect } from "@/shared/ui/custom-select"
import { DirectionIcon } from "@/shared/ui/icons"
import { Perm } from "@/shared/lib/rbac-client"
import { computeSimpleTrend } from "@/shared/lib/trend"
import { saveSample, deleteSample, bulkDeleteSamples } from "../actions"
import { SAMPLE_STATUS_LABEL, SAMPLE_STATUS_ORDER, groupSamplesByProject, type SampleRow, type Option } from "../types"

function statusTone(status: string): "neutral" | "info" | "success" | "warning" {
  if (status === "completed") return "success"
  if (status === "testing") return "info"
  if (status === "returned") return "warning"
  return "neutral"
}

const NO_PROJECT_KEY = "__none__"

// y/c 4.2 (23/07, 9:05 toi): Quan ly mau chuyen sang mo hinh danh sach the
// theo Du an (giong Danh muc/Ma tran/Nhan su/Chi phi bien doi bao gia) de
// chuan hoa theo layout chung - the danh sach truoc, chon 1 the de xem bang
// mau chi tiet cua du an do, thay cho kieu accordion cu (khong dung class
// .cu-grid/.hub-card nen khong dong bo giao dien va bi vo ket cau bang khi
// doi mau toi vi dung mau hex cung thay vi bien theme).
export function SamplesView({ samples, customers, projects }: { samples: SampleRow[]; customers: Option[]; projects: Option[] }) {
  const [q, setQ] = useState("")
  const [openGroupKey, setOpenGroupKey] = useState("")
  const [editing, setEditing] = useState<SampleRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // CustomSelect dieu khien bang state, khong tu sinh input "name" nhu <select>
  // goc - dong bo lai moi khi mo form (cung mau sua nhu PlanView ban ba).
  const [sProjectId, setSProjectId] = useState("")
  const [sCustomerId, setSCustomerId] = useState("")
  const [sStatus, setSStatus] = useState("")

  useEffect(() => {
    if (showForm) {
      setSProjectId(editing?.projectId ?? "")
      setSCustomerId(editing?.customerId ?? "")
      setSStatus(editing?.status ?? "")
    }
  }, [showForm, editing])

  const kpis = useMemo(() => {
    const total = samples.length
    const testing = samples.filter((s) => s.derivedStatus === "testing").length
    const done = samples.filter((s) => s.derivedStatus === "completed" || s.derivedStatus === "returned").length
    const received = samples.filter((s) => s.derivedStatus === "received").length
    return { total, testing, done, received }
  }, [samples])
  const trends=useMemo(()=>({total:computeSimpleTrend(samples,s=>true,s=>s.createdAt),testing:computeSimpleTrend(samples,s=>s.derivedStatus==="testing",s=>s.createdAt),done:computeSimpleTrend(samples,s=>s.derivedStatus==="completed"||s.derivedStatus==="returned",s=>s.createdAt),received:computeSimpleTrend(samples,s=>s.derivedStatus==="received",s=>s.createdAt)}),[samples])

  // Danh sach the theo Du an - luon tinh tren TOAN BO mau (khong loc theo q),
  // giong dung pattern cua Danh muc/Ma tran/Nhan su/Chi phi bien doi.
  const groups = useMemo(() => groupSamplesByProject(samples), [samples])
  const openGroup = groups.find((g) => (g.project?.id ?? NO_PROJECT_KEY) === openGroupKey) ?? null

  useEffect(() => {
    const el = document.getElementById("page-title")
    if (!el) return
    if (openGroup) {
      el.classList.add("title-back")
      el.title = "Quay lại danh sách dự án"
      const handler = () => backToGrid()
      el.addEventListener("click", handler)
      return () => {
        el.classList.remove("title-back")
        el.removeAttribute("title")
        el.removeEventListener("click", handler)
      }
    }
    el.classList.remove("title-back")
    el.removeAttribute("title")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openGroup?.project?.id])

  function openGroupFn(key: string) { setOpenGroupKey(key); setQ("") }
  function backToGrid() { setOpenGroupKey(""); setQ("") }

  // Loc theo q CHI trong pham vi the dang mo - giong dung pattern cua cac
  // trang danh sach the khac (khong loc toan bo truoc khi nhom the).
  const filtered = useMemo(() => {
    const list = openGroup ? openGroup.samples : []
    return list.filter((s) => {
      if (q) {
        const hay = `${s.code ?? s.name} ${s.serialNumber ?? ""} ${s.project?.name ?? ""}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [openGroup, q])

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
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleEditMode() {
    setEditMode((v) => { if (v) setSelected(new Set()); return !v })
  }
  function confirmBulkDelete() {
    const ids = Array.from(selected)
    startTransition(async () => { await bulkDeleteSamples(ids); setSelected(new Set()); setBulkConfirm(false) })
  }
  const allSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id))
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(filtered.map((s) => s.id))))
  }

  const columns: Array<DataTableColumn<SampleRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />, defaultWidth: 44,
          render: (s: SampleRow) => <input type="checkbox" checked={selected.has(s.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(s.id)} />,
        } as DataTableColumn<SampleRow>]
      : []),
    { key: "code", header: "Mã mẫu", render: (s) => <span style={{ fontWeight: 600 }}>{s.code ?? s.name}</span> },
    { key: "serial", header: "Số seri", render: (s) => s.serialNumber ?? "—" },
    { key: "qty", header: "SL", align: "right", render: (s) => s.qty ?? 1 },
    { key: "storageLocation", header: "Vị trí lưu", render: (s) => s.storageLocation ?? "—" },
    { key: "progress", header: "Tiến độ", render: (s) => (s.totalItems ? `${s.doneCount}/${s.totalItems} đạt` : "—") },
    { key: "status", header: "Trạng thái", render: (s) => <StatusBadge label={SAMPLE_STATUS_LABEL[s.derivedStatus] ?? s.derivedStatus} tone={statusTone(s.derivedStatus)} /> },
    {
      key: "actions", header: "", align: "right",
      render: (s) =>
        editMode ? (
          <span className="acts" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
            <Perm minPerm="technician">
              <IconButton icon="edit" variant="ghost" size={30} title="Sửa" onClick={() => openEdit(s)} />
              <IconButton icon="delete" variant="danger" size={30} title="Xoá" onClick={() => setConfirmDeleteId(s.id)} />
            </Perm>
          </span>
        ) : null,
    },
  ]

  return (
    <PageShell title="Quản lý Mẫu" subtitle={openGroup ? undefined : "Chọn một dự án để xem danh sách mẫu"}>
      <div id="page-samples">
      <div className="kpis-tier" style={{ marginBottom: 20 }}>
        <KpiCard label="Tổng số mẫu" value={kpis.total} tone="blue" trend={trends.total} />
        <KpiCard label="Đang thử nghiệm" value={kpis.testing} tone="warning" trend={trends.testing} />
        <KpiCard label="Hoàn thành" value={kpis.done} tone="success" trend={trends.done} />
        <KpiCard label="Mới nhận, chưa xếp lịch" value={kpis.received} tone="danger" trend={trends.received} />
      </div>

      {!openGroup && (
        groups.length === 0 ? (
          <div className="empty">Chưa có mẫu nào — thêm mẫu để tạo danh sách theo từng dự án.</div>
        ) : (
          <div className="cu-grid">
            {groups.map((g) => {
              const key = g.project?.id ?? NO_PROJECT_KEY
              const totalItems = g.samples.reduce((sum, s) => sum + s.totalItems, 0)
              const totalDone = g.samples.reduce((sum, s) => sum + s.doneCount, 0)
              const pct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0
              const testingCount = g.samples.filter((s) => s.derivedStatus === "testing").length
              const initial = (g.project?.name ?? "Khác").trim().slice(0, 2).toUpperCase() || "KH"
              return (
                <div key={key} className="hub-card" onClick={() => openGroupFn(key)} style={{ cursor: "pointer" }}>
                  <div className="hub-top">
                    <div className="hub-icon">{initial}</div>
                    <div className="hub-title">
                      <h4>{g.project ? g.project.name : "Không thuộc dự án nào"}</h4>
                      <p>{g.customer ? `${g.customer.name} · ` : ""}{g.samples.length} mẫu</p>
                    </div>
                    <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                  </div>
                  <div className="hub-stats">
                    <div className="hub-stat"><b>{g.samples.length}</b><span>Mẫu</span></div>
                    <div className="hub-stat"><b>{pct}%</b><span>Tiến độ</span></div>
                    <div className="hub-stat"><b>{testingCount}</b><span>Đang thử</span></div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {openGroup && (
        <>
          <div className="section-head">
            <h3>{openGroup.project ? openGroup.project.name : "Không thuộc dự án nào"}</h3>
            <div className="tools">
              <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm mã mẫu, seri..." }} />
              <Perm minPerm="technician">
                {editMode && (
                  <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xoá tất cả</button>
                )}
                <button type="button" className={editMode ? "btn-success" : "btn-line"} onClick={toggleEditMode}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
                <AddButton label="Thêm mẫu" onClick={openNew} />
              </Perm>
            </div>
          </div>
          <DataTable columns={columns} rows={filtered} rowKey={(s) => s.id} loading={pending} emptyTitle="Chưa có mẫu nào" onRowClick={(s) => openEdit(s)} resizable maxBodyHeight={560} fillHeight />
        </>
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
        width={640}
      >
        <form key={editing?.id ?? "new"} id="tf-sample-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="projectId" value={sProjectId} />
          <input type="hidden" name="customerId" value={sCustomerId} />
          <input type="hidden" name="status" value={sStatus} />
          <div className="field">
            <label>Mã mẫu *</label>
            <input name="code" required defaultValue={editing?.code ?? ""} />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Số seri</label>
              <input name="serialNumber" defaultValue={editing?.serialNumber ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Số lượng</label>
              <input name="qty" type="number" min={1} defaultValue={editing?.qty ?? 1} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Dự án</label>
              <CustomSelect value={sProjectId} onChange={setSProjectId} width="100%" options={[{ value: "", label: "—" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Khách hàng</label>
              <CustomSelect value={sCustomerId} onChange={setSCustomerId} width="100%" options={[{ value: "", label: "—" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Vị trí lưu</label>
              <input name="storageLocation" defaultValue={editing?.storageLocation ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Ngày nhận</label>
              <input type="date" name="receivedAt" defaultValue={editing?.receivedAt ? editing.receivedAt.slice(0, 10) : ""} />
            </div>
          </div>
          <div className="field">
            <label>Trạng thái mẫu</label>
            <CustomSelect value={sStatus} onChange={setSStatus} width="100%" options={[{ value: "", label: "— Tự động —" }, ...SAMPLE_STATUS_ORDER.map((s) => ({ value: s, label: SAMPLE_STATUS_LABEL[s] }))]} />
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Để trống để trạng thái tự suy ra từ tiến độ bài thử liên kết (giống hành vi bản gốc); chỉ chọn thủ công khi cần ghi đè.</div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá mẫu?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title="Xoá các mẫu đã chọn?" description={`Sẽ xoá ${selected.size} mẫu đã chọn. Hành động này không thể hoàn tác.`} danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
      </div>
    </PageShell>
  )
}

export default SamplesView
