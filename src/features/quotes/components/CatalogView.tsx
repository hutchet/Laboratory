"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { Perm } from "@/shared/lib/rbac-client"
import { saveTestCatalogItem, deleteTestCatalogItem, bulkDeleteTestCatalogItems } from "../actions"
import type { TestCatalogRow } from "../types"

export function CatalogView({ items }: { items: TestCatalogRow[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<TestCatalogRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => items.filter((it) => !q || it.name.toLowerCase().includes(q.toLowerCase())), [items, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: TestCatalogRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      code: String(formData.get("code") || ""),
      name: String(formData.get("name") || ""),
      standard: String(formData.get("standard") || ""),
      sampleQty: String(formData.get("sampleQty") || ""),
      leadTime: String(formData.get("leadTime") || ""),
      price: formData.get("price") ? Number(formData.get("price")) : null,
    }
    startTransition(async () => { await saveTestCatalogItem(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteTestCatalogItem(id); setConfirmDeleteId(null) })
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
    startTransition(async () => { await bulkDeleteTestCatalogItems(ids); setSelected(new Set()); setBulkConfirm(false) })
  }

  const columns: Array<DataTableColumn<TestCatalogRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: "", defaultWidth: 44,
          render: (it: TestCatalogRow) => <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} />,
        } as DataTableColumn<TestCatalogRow>]
      : []),
    { key: "code", header: "Mã", render: (it) => it.code ?? "—" },
    { key: "name", header: "Tên bài thử", render: (it) => <span style={{ fontWeight: 600 }}>{it.name}</span> },
    { key: "standard", header: "Tiêu chuẩn", render: (it) => it.standard ?? "—" },
    { key: "sampleQty", header: "Số lượng mẫu", render: (it) => it.sampleQty ?? "—" },
    { key: "leadTime", header: "Thời gian", render: (it) => it.leadTime ?? "—" },
    { key: "price", header: "Đơn giá", align: "right", render: (it) => (it.price != null ? it.price.toLocaleString("vi-VN") : "—") },
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
      title="Danh mục bài thử nghiệm"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          {editMode && (
            <button type="button" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #c62828", background: "#fff", color: "#c62828", opacity: selected.size ? 1 : 0.5 }}>Xoá mục đã chọn</button>
          )}
          <Perm minPerm="manager"><button type="button" onClick={toggleEditMode} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1d5fd6", background: editMode ? "#1d5fd6" : "#fff", color: editMode ? "#fff" : "#1d5fd6" }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
          <button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm bài thử</button></Perm>
        </span>
      }
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm bài thử..." }} />}
    >
      <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có bài thử nào" resizable />

      <FormModal
        open={showForm}
        title={editing ? "Sửa bài thử" : "Thêm bài thử"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-catalog-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form id="tf-catalog-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mã
              <input name="code" defaultValue={editing?.code ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 2 }}>Tên bài thử *
              <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tiêu chuẩn
            <input name="standard" defaultValue={editing?.standard ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số lượng mẫu
              <input name="sampleQty" defaultValue={editing?.sampleQty ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Thời gian
              <input name="leadTime" defaultValue={editing?.leadTime ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Đơn giá
              <input type="number" name="price" defaultValue={editing?.price ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá bài thử?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} bài thử đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default CatalogView
