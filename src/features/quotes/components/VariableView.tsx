"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { Perm } from "@/shared/lib/rbac-client"
import { saveVariableCost, deleteVariableCost, bulkDeleteVariableCosts } from "../actions"
import type { VariableCostRow } from "../types"

export function VariableView({ items }: { items: VariableCostRow[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<VariableCostRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => items.filter((it) => !q || it.costType.toLowerCase().includes(q.toLowerCase())), [items, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: VariableCostRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      costType: String(formData.get("costType") || ""),
      description: String(formData.get("description") || ""),
      amount: formData.get("amount") ? Number(formData.get("amount")) : null,
    }
    startTransition(async () => { await saveVariableCost(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteVariableCost(id); setConfirmDeleteId(null) })
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
    startTransition(async () => { await bulkDeleteVariableCosts(ids); setSelected(new Set()); setBulkConfirm(false) })
  }

  const columns: Array<DataTableColumn<VariableCostRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: "", defaultWidth: 44,
          render: (it: VariableCostRow) => <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} />,
        } as DataTableColumn<VariableCostRow>]
      : []),
    { key: "costType", header: "Loại chi phí", render: (it) => <span style={{ fontWeight: 600 }}>{it.costType}</span> },
    { key: "description", header: "Mô tả", render: (it) => it.description ?? "—" },
    { key: "amount", header: "Số tiền", align: "right", render: (it) => (it.amount != null ? it.amount.toLocaleString("vi-VN") : "—") },
    {
      key: "actions", header: "", align: "right",
      render: (it) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Perm minPerm="manager"><button type="button" onClick={() => openEdit(it)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteId(it.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button></Perm>
        </span>
      ),
    },
  ]

  return (
    <PageShell
      title="Chi phí biến đổi khác"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          {editMode && (
            <button type="button" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #c62828", background: "#fff", color: "#c62828", opacity: selected.size ? 1 : 0.5 }}>Xoá mục đã chọn</button>
          )}
          <Perm minPerm="manager"><button type="button" onClick={toggleEditMode} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1d5fd6", background: editMode ? "#1d5fd6" : "#fff", color: editMode ? "#fff" : "#1d5fd6" }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
          <button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm chi phí</button></Perm>
        </span>
      }
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm chi phí..." }} />}
    >
      <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có chi phí nào" resizable />

      <FormModal
        open={showForm}
        title={editing ? "Sửa chi phí" : "Thêm chi phí"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-variable-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-variable-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Loại chi phí *
            <input name="costType" required defaultValue={editing?.costType ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Mô tả
            <input name="description" defaultValue={editing?.description ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Số tiền
            <input type="number" name="amount" defaultValue={editing?.amount ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá chi phí?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} chi phí đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default VariableView
