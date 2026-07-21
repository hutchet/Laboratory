"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { Perm } from "@/shared/lib/rbac-client"
import { saveDepreciationAsset, deleteDepreciationAsset, bulkDeleteDepreciationAssets } from "../actions"
import type { DepreciationAssetRow } from "../types"

export function DepreciationView({ items }: { items: DepreciationAssetRow[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<DepreciationAssetRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => items.filter((it) => !q || it.assetName.toLowerCase().includes(q.toLowerCase())), [items, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: DepreciationAssetRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      assetName: String(formData.get("assetName") || ""),
      assetGroup: String(formData.get("assetGroup") || ""),
      totalValue: formData.get("totalValue") ? Number(formData.get("totalValue")) : null,
      years: formData.get("years") ? Number(formData.get("years")) : null,
    }
    startTransition(async () => { await saveDepreciationAsset(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteDepreciationAsset(id); setConfirmDeleteId(null) })
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
    startTransition(async () => { await bulkDeleteDepreciationAssets(ids); setSelected(new Set()); setBulkConfirm(false) })
  }

  const columns: Array<DataTableColumn<DepreciationAssetRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: "", defaultWidth: 44,
          render: (it: DepreciationAssetRow) => <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} />,
        } as DataTableColumn<DepreciationAssetRow>]
      : []),
    { key: "assetName", header: "Tài sản", render: (it) => <span style={{ fontWeight: 600 }}>{it.assetName}</span> },
    { key: "assetGroup", header: "Nhóm", render: (it) => it.assetGroup ?? "—" },
    { key: "totalValue", header: "Giá trị", align: "right", render: (it) => (it.totalValue != null ? it.totalValue.toLocaleString("vi-VN") : "—") },
    { key: "years", header: "Số năm KH", align: "right", render: (it) => it.years ?? "—" },
    {
      key: "actions", header: "", align: "right",
      render: (it) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Perm minPerm="dept_head"><button type="button" onClick={() => openEdit(it)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteId(it.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button></Perm>
        </span>
      ),
    },
  ]

  return (
    <PageShell
      title="Khấu hao thiết bị"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          {editMode && (
            <button type="button" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #c62828", background: "#fff", color: "#c62828", opacity: selected.size ? 1 : 0.5 }}>Xoá mục đã chọn</button>
          )}
          <Perm minPerm="dept_head"><button type="button" onClick={toggleEditMode} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1d5fd6", background: editMode ? "#1d5fd6" : "#fff", color: editMode ? "#fff" : "#1d5fd6" }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
          <button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm tài sản</button></Perm>
        </span>
      }
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm tài sản..." }} />}
    >
      <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có tài sản nào" resizable />

      <FormModal
        open={showForm}
        title={editing ? "Sửa tài sản" : "Thêm tài sản"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-depreciation-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-depreciation-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tài sản *
            <input name="assetName" required defaultValue={editing?.assetName ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Nhóm
            <input name="assetGroup" defaultValue={editing?.assetGroup ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giá trị
              <input type="number" name="totalValue" defaultValue={editing?.totalValue ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số năm khấu hao
              <input type="number" name="years" defaultValue={editing?.years ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá tài sản?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} tài sản đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default DepreciationView
