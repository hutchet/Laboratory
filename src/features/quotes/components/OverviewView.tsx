"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { Perm } from "@/shared/lib/rbac-client"
import { saveQuote, deleteQuote } from "../actions"
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
    { key: "title", header: "Báo giá", render: (it) => <span style={{ fontWeight: 600 }}>{it.title}</span> },
    { key: "customer", header: "Khách hàng", render: (it) => it.customer?.name ?? "—" },
    { key: "project", header: "Dự án", render: (it) => it.project?.name ?? "—" },
    { key: "totalAmount", header: "Tổng tiền", align: "right", render: (it) => (it.totalAmount != null ? it.totalAmount.toLocaleString("vi-VN") : "—") },
    { key: "status", header: "Trạng thái", render: (it) => <StatusBadge label={QUOTE_STATUS_LABEL[it.status ?? "draft"] ?? it.status ?? "—"} tone={statusTone(it.status)} /> },
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
      title="Tổng quan báo giá"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={exportExcel} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1d5fd6", background: "#fff", color: "#1d5fd6" }}>Xuất Excel</button>
          <button type="button" onClick={() => window.print()} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1d5fd6", background: "#fff", color: "#1d5fd6" }}>Xuất PDF</button>
          <Perm minPerm="manager"><button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm báo giá</button></Perm>
        </span>
      }
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm báo giá..." }} />}
    >
      <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có báo giá nào" />

      <FormModal
        open={showForm}
        title={editing ? "Sửa báo giá" : "Thêm báo giá"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-quote-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-quote-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên báo giá *
            <input name="title" required defaultValue={editing?.title ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Khách hàng
              <select name="customerId" defaultValue={editing?.customerId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Dự án
              <select name="projectId" defaultValue={editing?.projectId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
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
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Trạng thái
              <select name="status" defaultValue={editing?.status ?? "draft"} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="draft">Bản nháp</option>
                <option value="sent">Đã gửi</option>
                <option value="approved">Đã duyệt</option>
                <option value="rejected">Bị từ chối</option>
              </select>
            </label>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá báo giá?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
    </PageShell>
  )
}

export default OverviewView
