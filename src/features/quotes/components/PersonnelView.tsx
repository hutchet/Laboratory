"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { Perm } from "@/shared/lib/rbac-client"
import { savePersonnelRateConfig, savePersonnelRouting, deletePersonnelRouting, bulkDeletePersonnelRouting } from "../actions"
import type { PersonnelRateConfigRow, PersonnelRoutingRow } from "../types"

export function PersonnelView({ config, routing }: { config: PersonnelRateConfigRow; routing: PersonnelRoutingRow[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<PersonnelRoutingRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => routing.filter((it) => !q || it.testName.toLowerCase().includes(q.toLowerCase())), [routing, q])

  function saveRates(formData: FormData) {
    const input = {
      techRate: Number(formData.get("techRate") || 0),
      engRate: Number(formData.get("engRate") || 0),
      leadRate: Number(formData.get("leadRate") || 0),
      mgrRate: Number(formData.get("mgrRate") || 0),
      overheadPct: Number(formData.get("overheadPct") || 0),
    }
    startTransition(async () => { await savePersonnelRateConfig(input) })
  }

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: PersonnelRoutingRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      testCode: String(formData.get("testCode") || ""),
      testName: String(formData.get("testName") || ""),
      prepHours: String(formData.get("prepHours") || ""),
      setupHours: String(formData.get("setupHours") || ""),
      testHours: String(formData.get("testHours") || ""),
      reportHours: String(formData.get("reportHours") || ""),
    }
    startTransition(async () => { await savePersonnelRouting(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deletePersonnelRouting(id); setConfirmDeleteId(null) })
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
    startTransition(async () => { await bulkDeletePersonnelRouting(ids); setSelected(new Set()); setBulkConfirm(false) })
  }
  const allSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id))
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(filtered.map((it) => it.id))))
  }

  const columns: Array<DataTableColumn<PersonnelRoutingRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />, defaultWidth: 44,
          render: (it: PersonnelRoutingRow) => <input type="checkbox" checked={selected.has(it.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(it.id)} />,
        } as DataTableColumn<PersonnelRoutingRow>]
      : []),
    { key: "testCode", header: "Mã", render: (it) => it.testCode ?? "—" },
    { key: "testName", header: "Bài thử", render: (it) => <span style={{ fontWeight: 600 }}>{it.testName}</span> },
    { key: "prepHours", header: "Giờ chuẩn bị", render: (it) => it.prepHours ?? "—" },
    { key: "setupHours", header: "Giờ lắp đặt", render: (it) => it.setupHours ?? "—" },
    { key: "testHours", header: "Giờ thử", render: (it) => it.testHours ?? "—" },
    { key: "reportHours", header: "Giờ báo cáo", render: (it) => it.reportHours ?? "—" },
    {
      key: "actions", header: "", align: "right",
      render: (it) =>
        editMode ? (
          <span className="acts" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
            <Perm minPerm="dept_head">
              <button type="button" className="txt-act pri" onClick={() => openEdit(it)}>Sửa</button>
              <button type="button" className="txt-act del" onClick={() => setConfirmDeleteId(it.id)}>Xoá</button>
            </Perm>
          </span>
        ) : null,
    },
  ]

  return (
    <PageShell
      title="Đơn giá nhân sự"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          {editMode && (
            <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xoá tất cả</button>
          )}
          <Perm minPerm="dept_head"><button type="button" className={editMode ? "btn-success" : "btn-line"} onClick={toggleEditMode}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
          <button type="button" className="btn-pri" onClick={openNew}>+ Thêm định tuyến</button></Perm>
        </span>
      }
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm bài thử..." }} />}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); saveRates(new FormData(e.currentTarget)) }}
        style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, padding: 12, border: "1px solid #e7eaee", borderRadius: 10, flexWrap: "wrap" }}
      >
        <label style={{ fontSize: 12, fontWeight: 600 }}>Kỹ thuật viên
          <input type="number" name="techRate" defaultValue={config.techRate} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Kỹ sư
          <input type="number" name="engRate" defaultValue={config.engRate} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Trưởng nhóm
          <input type="number" name="leadRate" defaultValue={config.leadRate} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Quản lý
          <input type="number" name="mgrRate" defaultValue={config.mgrRate} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Phụ phí (%)
          <input type="number" name="overheadPct" defaultValue={config.overheadPct} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
        </label>
        <button type="submit" style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>Lưu đơn giá</button>
      </form>

      <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có định tuyến nào" onRowClick={(it) => openEdit(it)} resizable maxBodyHeight={560} />

      <FormModal
        open={showForm}
        title={editing ? "Sửa định tuyến" : "Thêm định tuyến nhân công"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-routing-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-routing-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mã
              <input name="testCode" defaultValue={editing?.testCode ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 2 }}>Tên bài thử *
              <input name="testName" required defaultValue={editing?.testName ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giờ chuẩn bị
              <input name="prepHours" defaultValue={editing?.prepHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giờ lắp đặt
              <input name="setupHours" defaultValue={editing?.setupHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giờ thử
              <input name="testHours" defaultValue={editing?.testHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giờ báo cáo
              <input name="reportHours" defaultValue={editing?.reportHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá định tuyến?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} định tuyến đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default PersonnelView
