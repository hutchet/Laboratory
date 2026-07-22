"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { CustomSelect } from "@/shared/ui/custom-select"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { Perm } from "@/shared/lib/rbac-client"
import { saveQuote, deleteQuote, bulkDeleteQuotes } from "../actions"
import { QUOTE_STATUS_LABEL, type QuoteRow, type Option } from "../types"

function statusTone(status: string | null): "neutral" | "info" | "success" | "danger" {
  if (status === "approved") return "success"
  if (status === "rejected") return "danger"
  if (status === "sent") return "info"
  return "neutral"
}

// Ported from the original's exportQuoteExcel(): downloads an .xls file (HTML table blob), same
// technique the original used, alongside exportQuotePDF() which just calls window.print().
function downloadXls(filename: string, rows: Array<Array<string | number | null>>) {
  const esc = (v: string | number | null) => String(v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
  const html = `<html><head><meta charset="utf-8"></head><body><table border="1">${body}</table></body></html>`
  const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function OverviewView({ quotes, customers, projects }: { quotes: QuoteRow[]; customers: Option[]; projects: Option[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<QuoteRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const [qCustomerId, setQCustomerId] = useState("")
  const [qProjectId, setQProjectId] = useState("")
  const [qStatus, setQStatus] = useState("draft")

  useEffect(() => {
    if (showForm) {
      setQCustomerId(editing?.customerId ?? "")
      setQProjectId(editing?.projectId ?? "")
      setQStatus(editing?.status ?? "draft")
    }
  }, [showForm, editing])

  const filtered = useMemo(() => quotes.filter((it) => !q || it.title.toLowerCase().includes(q.toLowerCase())), [quotes, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: QuoteRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      title: String(formData.get("title") || ""),
      code: String(formData.get("code") || ""),
      customerId: String(formData.get("customerId") || "") || null,
      projectId: String(formData.get("projectId") || "") || null,
      quoteDate: String(formData.get("quoteDate") || "") || null,
      vatPercent: formData.get("vatPercent") ? Number(formData.get("vatPercent")) : 10,
      totalAmount: formData.get("totalAmount") ? Number(formData.get("totalAmount")) : null,
      status: String(formData.get("status") || "draft"),
    }
    startTransition(async () => { await saveQuote(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteQuote(id); setConfirmDeleteId(null) })
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
    startTransition(async () => { await bulkDeleteQuotes(ids); setSelected(new Set()); setBulkConfirm(false) })
  }
  const allSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id))
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(filtered.map((it) => it.id))))
  }

  function exportExcel() {
    const header = ["Báo giá", "Khách hàng", "Dự án", "Tổng tiền", "Trạng thái"]
    const rows = filtered.map((it) => [
      it.title,
      it.customer?.name ?? "",
      it.project?.name ?? "",
      it.totalAmount ?? "",
      QUOTE_STATUS_LABEL[it.status ?? "draft"] ?? it.status ?? "",
    ])
    downloadXls("bao-gia.xls", [header, ...rows])
  }

  const columns: Array<DataTableColumn<QuoteRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />, defaultWidth: 44,
          render: (it: QuoteRow) => <input type="checkbox" checked={selected.has(it.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(it.id)} />,
        } as DataTableColumn<QuoteRow>]
      : []),
    { key: "title", header: "Báo giá", render: (it) => <span style={{ fontWeight: 600 }}>{it.title}</span> },
    { key: "customer", header: "Khách hàng", render: (it) => it.customer?.name ?? "—" },
    { key: "project", header: "Dự án", render: (it) => it.project?.name ?? "—" },
    { key: "totalAmount", header: "Tổng tiền", align: "right", render: (it) => (it.totalAmount != null ? it.totalAmount.toLocaleString("vi-VN") : "—") },
    { key: "status", header: "Trạng thái", render: (it) => <StatusBadge label={QUOTE_STATUS_LABEL[it.status ?? "draft"] ?? it.status ?? "—"} tone={statusTone(it.status)} /> },
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
      title="Tổng quan báo giá"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn-line" onClick={exportExcel}>Xuất Excel</button>
          <button type="button" className="btn-line" onClick={() => window.print()}>Xuất PDF</button>
          <Perm minPerm="dept_head">
            {editMode && (
              <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xoá tất cả</button>
            )}
            <button type="button" className={editMode ? "btn-success" : "btn-line"} onClick={toggleEditMode}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
            <button type="button" className="btn-pri" onClick={openNew}>+ Thêm báo giá</button>
          </Perm>
        </span>
      }
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm báo giá..." }} />}
    >
      <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có báo giá nào" onRowClick={(it) => openEdit(it)} resizable maxBodyHeight={560} />

      <FormModal
        open={showForm}
        title={editing ? "Sửa báo giá" : "Thêm báo giá"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-quote-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
        width={640}
      >
        <form key={editing?.id ?? "new"} id="tf-quote-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên báo giá *
            <input name="title" required defaultValue={editing?.title ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <input type="hidden" name="customerId" value={qCustomerId} />
          <input type="hidden" name="projectId" value={qProjectId} />
          <input type="hidden" name="status" value={qStatus} />
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Khách hàng</label>
              <CustomSelect value={qCustomerId} onChange={setQCustomerId} width="100%" options={[{ value: "", label: "—" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Dự án</label>
              <CustomSelect value={qProjectId} onChange={setQProjectId} width="100%" options={[{ value: "", label: "—" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Ngày báo giá
              <input type="date" name="quoteDate" defaultValue={editing?.quoteDate ? editing.quoteDate.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>VAT (%)
              <input type="number" name="vatPercent" defaultValue={editing?.vatPercent ?? 10} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Tổng tiền
              <input type="number" name="totalAmount" defaultValue={editing?.totalAmount ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <div className="field" style={{ flex: 1 }}>
              <label>Trạng thái</label>
              <CustomSelect value={qStatus} onChange={setQStatus} width="100%" options={[{ value: "draft", label: "Bản nháp" }, { value: "sent", label: "Đã gửi" }, { value: "approved", label: "Đã duyệt" }, { value: "rejected", label: "Bị từ chối" }]} />
            </div>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá báo giá?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title="Xoá các báo giá đã chọn?" description={`Sẽ xoá ${selected.size} báo giá đã chọn. Hành động này không thể hoàn tác.`} danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default OverviewView
