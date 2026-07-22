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

// y/c #105.4: cong thuc port dung tu renderQuoteDep()/qtDepRate() ban goc (dong
// ~4354-4368 cua taskflow_original.html): Khau hao/gio = Tong gia tri / (So nam KH x 8640 gio/nam).
function khPerHour(totalValue: number | null, years: number | null): number {
  const v = totalValue ?? 0
  const y = years && years > 0 ? years : 1
  return Math.round(v / (y * 8640))
}

export function DepreciationView({ items }: { items: DepreciationAssetRow[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<DepreciationAssetRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pending, startTransition] = useTransition()
  // y/c #105.4: preview "Khấu hao/giờ tự tính" trong form - port cua callout
  // #qtdf-prev ban goc (dong ~4380 taskflow_original.html).
  const [dvValue, setDvValue] = useState<string>("")
  const [dvYears, setDvYears] = useState<string>("")

  const filtered = useMemo(() => items.filter((it) => !q || it.assetName.toLowerCase().includes(q.toLowerCase())), [items, q])

  function openNew() { setEditing(null); setDvValue(""); setDvYears(""); setShowForm(true) }
  function openEdit(it: DepreciationAssetRow) { setEditing(it); setDvValue(String(it.totalValue ?? "")); setDvYears(String(it.years ?? "")); setShowForm(true) }
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
    // đợt rà soát lần 4: bổ sung cột "Số thứ tự" bị thiếu so với bắng gốc (thead
    // #page-quote-depreciation dòng 3607 taskflow_original.html có cột STT riêng, không chỉ checkbox).
    { key: "idx", header: "STT", defaultWidth: 52, render: (it) => filtered.findIndex((x) => x.id === it.id) + 1 },
    { key: "assetName", header: "Tài sản", render: (it) => <span style={{ fontWeight: 600 }}>{it.assetName}</span> },
    { key: "assetGroup", header: "Nhóm", render: (it) => it.assetGroup ?? "—" },
    // đợt rà soát lần 4: sửa lại viết tắt đồng tiền “VĐĐ” (sai) thành “VNĐ” cho đúng với tiêu đề cột gốc.
    { key: "totalValue", header: "Tổng giá trị (VNĐ)", align: "right", render: (it) => (it.totalValue != null ? it.totalValue.toLocaleString("vi-VN") : "—") },
    { key: "years", header: "Số năm KH", align: "right", render: (it) => it.years ?? "—" },
    // y/c #105.4: bo sung cot "Khau hao/gio" bi thieu so voi bang goc (thead
    // #page-quote-depreciation dong 3610 taskflow_original.html) - tinh tu khPerHour().
    { key: "khPerHour", header: "Khấu hao/giờ (VNĐ)", align: "right", render: (it) => <b>{khPerHour(it.totalValue, it.years).toLocaleString("vi-VN")}</b> },
    ...(editMode
      ? [{
          key: "actions", header: "", align: "right" as const,
          render: (it: DepreciationAssetRow) => (
            <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Perm minPerm="dept_head"><button type="button" className="txt-act pri" onClick={() => openEdit(it)}>Sửa</button>
              <button type="button" className="txt-act del" onClick={() => setConfirmDeleteId(it.id)}>Xoá</button></Perm>
            </span>
          ),
        } as DataTableColumn<DepreciationAssetRow>]
      : []),
  ]

  return (
    <PageShell
      title="Khấu hao thiết bị"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          {editMode && (
            <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xoá mục đã chọn</button>
          )}
          <Perm minPerm="dept_head"><button type="button" className={editMode ? "btn-success" : "btn-line"} onClick={toggleEditMode}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
          <button type="button" className="btn-pri" onClick={openNew}>+ Thêm tài sản</button></Perm>
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
        width={640}
      >
        <form key={editing?.id ?? "new"} id="tf-depreciation-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tài sản *
            <input name="assetName" required defaultValue={editing?.assetName ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Nhóm tài sản
              <input name="assetGroup" defaultValue={editing?.assetGroup ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Tổng giá trị (đ)
              <input type="number" name="totalValue" value={dvValue} onChange={(e) => setDvValue(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số năm khấu hao
              <input type="number" name="years" value={dvYears} onChange={(e) => setDvYears(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div className="callout" style={{ fontSize: 12, marginTop: 4 }}>
            Khấu hao/giờ tự tính = Tổng giá trị ÷ (Số năm × 8640 giờ):{" "}
            <b style={{ color: "var(--pri)" }}>{khPerHour(Number(dvValue) || 0, Number(dvYears) || 0).toLocaleString("vi-VN")}</b> đ/giờ
          </div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá tài sản?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} tài sản đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default DepreciationView
