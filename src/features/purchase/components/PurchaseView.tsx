"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { KpiCard } from "@/shared/ui/kpi-card"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { savePurchaseItem, deletePurchaseItem, bulkDeletePurchaseItems } from "../actions"
import {
  PURCHASE_STATUS_LABEL,
  PURCHASE_GROUPBY_LABEL,
  purchaseGroupKey,
  purchaseParseAmount,
  purchaseFormatAmount,
  type PurchaseItemRow,
  type PurchaseGroupBy,
} from "../types"

function statusTone(status: string | null): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "received" || status === "Done") return "success"
  if (status === "cancelled" || status === "Hủy") return "danger"
  if (status === "Chậm") return "warning"
  if (status === "ordered" || status === "On-going") return "info"
  return "neutral"
}

// Ported from esc()+CSV-friendly quoting used by the AuditPlan CSV export.
function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Ported field list from openPmForm (19-column detail table order, minus checkbox/STT/actions).
const FIELD_DEFS: Array<{ key: keyof PurchaseItemRow; label: string; area?: boolean }> = [
  { key: "amount", label: "Giá trị (VNĐ)" },
  { key: "price", label: "Đơn giá" },
  { key: "supplier", label: "Nhà cung cấp" },
  { key: "task", label: "Loại task" },
  { key: "tfs", label: "TFS" },
  { key: "jira", label: "Jira" },
  { key: "pr", label: "Mã PR" },
  { key: "po", label: "Mã PO" },
  { key: "migo", label: "MIGO" },
  { key: "tinhtrang", label: "Tình trạng chi tiết", area: true },
  { key: "tfslink", label: "Liên kết TFS" },
]

export function PurchaseView({
  items,
  members,
  centers,
}: {
  items: PurchaseItemRow[]
  members: Array<{ id: string; name: string; team: string | null }>
  centers: Array<{ id: string; name: string }>
}) {
  const [groupBy, setGroupBy] = useState<PurchaseGroupBy>("lab")
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<PurchaseItemRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [pending, startTransition] = useTransition()

  // ---- KPI (ported from pm-k-total / pm-k-value / pm-k-ongoing / pm-k-done) ----
  const totalValue = useMemo(() => items.reduce((s, it) => s + purchaseParseAmount(it.amount), 0), [items])
  const ongoingCount = items.filter((it) => it.status === "On-going").length
  const doneCount = items.filter((it) => it.status === "Done").length

  // ---- group map (ported from renderPurchase's map/keys build) ----
  const groups = useMemo(() => {
    const map = new Map<string, PurchaseItemRow[]>()
    for (const it of items) {
      const k = purchaseGroupKey(it, groupBy, members)
      const list = map.get(k) ?? []
      list.push(it)
      map.set(k, list)
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length)
  }, [items, groupBy, members])

  const activeList = useMemo(() => {
    const list = groups.find(([k]) => k === openGroup)?.[1] ?? []
    return list.filter((it) => !q || it.name.toLowerCase().includes(q.toLowerCase()))
  }, [groups, openGroup, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: PurchaseItemRow) { setEditing(it); setShowForm(true) }

  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      name: String(formData.get("name") || ""),
      amount: String(formData.get("amount") || ""),
      price: String(formData.get("price") || ""),
      supplier: String(formData.get("supplier") || ""),
      task: String(formData.get("task") || ""),
      tfs: String(formData.get("tfs") || ""),
      jira: String(formData.get("jira") || ""),
      pr: String(formData.get("pr") || ""),
      po: String(formData.get("po") || ""),
      migo: String(formData.get("migo") || ""),
      tinhtrang: String(formData.get("tinhtrang") || ""),
      pic: String(formData.get("pic") || ""),
      owner: String(formData.get("owner") || ""),
      lab: String(formData.get("lab") || ""),
      status: String(formData.get("status") || ""),
      tfslink: String(formData.get("tfslink") || ""),
    }
    startTransition(async () => { await savePurchaseItem(input); setShowForm(false); setEditing(null) })
  }

  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deletePurchaseItem(id); setConfirmDeleteId(null) })
  }

  function confirmBulkDelete() {
    const ids = Array.from(selected)
    startTransition(async () => { await bulkDeletePurchaseItems(ids); setSelected(new Set()); setBulkConfirm(false) })
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Ported from the 19-column table in renderPurchase (checkbox/STT/actions handled separately).
  // defaultWidth values are ported 1:1 from the original cols=[{w:...}] definitions.
  const columns: Array<DataTableColumn<PurchaseItemRow>> = [
    {
      key: "sel", header: "", defaultWidth: 44,
      render: (it) => <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} />,
    },
    { key: "name", header: "Tên hạng mục", defaultWidth: 220, render: (it) => <span style={{ fontWeight: 600 }}>{it.name}</span> },
    { key: "amount", header: "Giá trị", align: "right", defaultWidth: 130, render: (it) => (it.amount ? `${purchaseFormatAmount(purchaseParseAmount(it.amount))} đ` : "—") },
    { key: "price", header: "Đơn giá", defaultWidth: 110, render: (it) => it.price ?? "—" },
    { key: "supplier", header: "Nhà cung cấp", defaultWidth: 170, render: (it) => it.supplier ?? "—" },
    { key: "task", header: "Loại task", defaultWidth: 120, render: (it) => it.task ?? "—" },
    { key: "tfs", header: "TFS", defaultWidth: 100, render: (it) => it.tfs ?? "—" },
    { key: "jira", header: "Jira", defaultWidth: 80, render: (it) => (it.jira ? <a href={it.jira.split(/\n/)[0]} target="_blank" rel="noopener">Link</a> : "—") },
    { key: "pr", header: "PR", defaultWidth: 100, render: (it) => it.pr ?? "—" },
    { key: "po", header: "PO", defaultWidth: 100, render: (it) => it.po ?? "—" },
    { key: "migo", header: "MIGO", defaultWidth: 100, render: (it) => it.migo ?? "—" },
    { key: "tinhtrang", header: "Tình trạng", defaultWidth: 200, render: (it) => it.tinhtrang ?? "—" },
    { key: "owner", header: "Người phụ trách", defaultWidth: 150, render: (it) => it.owner ?? "—" },
    { key: "pic", header: "Phòng mua hàng", defaultWidth: 160, render: (it) => it.pic ?? "—" },
    { key: "lab", header: "Trung tâm", defaultWidth: 150, render: (it) => it.lab ?? "—" },
    {
      key: "status", header: "Trạng thái", defaultWidth: 200,
      render: (it) => <StatusBadge label={PURCHASE_STATUS_LABEL[it.status ?? ""] ?? it.status ?? "—"} tone={statusTone(it.status)} />,
    },
    { key: "tfslink", header: "TFS Link", defaultWidth: 80, render: (it) => (it.tfslink && it.tfslink.startsWith("http") ? <a href={it.tfslink} target="_blank" rel="noopener">Link</a> : "—") },
    {
      key: "actions", header: "", align: "right", defaultWidth: 110,
      render: (it) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => openEdit(it)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteId(it.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button>
        </span>
      ),
    },
  ]

  function exportCsv() {
    const header = ["Tên hạng mục", "Giá trị", "Đơn giá", "Nhà cung cấp", "Loại task", "TFS", "Jira", "PR", "PO", "MIGO", "Tình trạng", "Người phụ trách", "Phòng mua hàng", "Trung tâm", "Trạng thái", "TFS Link"]
    const rows = (openGroup ? activeList : items).map((it) => [it.name, it.amount, it.price, it.supplier, it.task, it.tfs, it.jira, it.pr, it.po, it.migo, it.tinhtrang, it.owner, it.pic, it.lab, it.status, it.tfslink])
    downloadCsv("purchase-items.csv", [header, ...rows])
  }

  // ---- OVERVIEW (hub-card grouping, ported from renderPurchase's pm-overview-grid) ----
  if (!openGroup) {
    return (
      <PageShell
        title="Theo dõi mua hàng"
        actions={<>
          <button type="button" onClick={exportCsv} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff", marginRight: 8 }}>Xuất CSV</button>
          <button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm hạng mục</button>
        </>}
        filters={<div style={{ display: "flex", gap: 8 }}>
          {(Object.keys(PURCHASE_GROUPBY_LABEL) as PurchaseGroupBy[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #dfe3e8", background: groupBy === g ? "#1d5fd6" : "#fff", color: groupBy === g ? "#fff" : "#1a1a1a" }}
            >
              Theo {PURCHASE_GROUPBY_LABEL[g]}
            </button>
          ))}
        </div>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <KpiCard label="Tổng hạng mục" value={items.length} tone="neutral" />
          <KpiCard label="Tổng giá trị" value={`${purchaseFormatAmount(totalValue)} đ`} tone="neutral" />
          <KpiCard label="Đang triển khai" value={ongoingCount} tone="warning" />
          <KpiCard label="Hoàn thành" value={doneCount} tone="success" />
        </div>

        {!items.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Chưa có hạng mục mua hàng nào</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {groups.map(([key, list]) => {
              const val = list.reduce((s, it) => s + purchaseParseAmount(it.amount), 0)
              const done = list.filter((it) => it.status === "Done").length
              const ongoing = list.filter((it) => it.status === "On-going").length
              const cham = list.filter((it) => it.status === "Chậm").length
              const progress = list.length ? Math.round((done * 100) / list.length) : 0
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOpenGroup(key)}
                  style={{ textAlign: "left", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff", cursor: "pointer" }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{key}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>{list.length} hạng mục · {purchaseFormatAmount(val)} đ</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, background: "#f3f4f6", borderRadius: 10, padding: "2px 8px" }}>{done} hoàn thành</span>
                    <span style={{ fontSize: 11, background: "#f3f4f6", borderRadius: 10, padding: "2px 8px" }}>{ongoing} đang triển khai</span>
                    {cham > 0 && <span style={{ fontSize: 11, background: "#fee2e2", color: "#c62828", borderRadius: 10, padding: "2px 8px" }}>{cham} chậm</span>}
                  </div>
                  <div style={{ height: 6, background: "#f0f1f3", borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${progress}%`, background: "#1d5fd6", borderRadius: 3 }} />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {showForm && (
          <PurchaseFormModal
            editing={editing}
            members={members}
            centers={centers}
            pending={pending}
            onClose={() => { setShowForm(false); setEditing(null) }}
            onSubmit={handleSubmit}
          />
        )}
        <ConfirmDialog open={!!confirmDeleteId} title="Xoá hạng mục?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      </PageShell>
    )
  }

  // ---- DETAIL (ported from renderPurchase's pm-detail-shell, 19-column table) ----
  return (
    <PageShell
      title={`Theo dõi mua hàng — ${openGroup}`}
      actions={<>
        <button type="button" onClick={() => setOpenGroup(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff", marginRight: 8 }}>← Danh sách nhóm</button>
        <button type="button" onClick={exportCsv} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff", marginRight: 8 }}>Xuất CSV</button>
        {selected.size > 0 && (
          <button type="button" onClick={() => setBulkConfirm(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#c62828", color: "#fff", marginRight: 8 }}>Xoá {selected.size} mục đã chọn</button>
        )}
        <button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm hạng mục</button>
      </>}
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm hạng mục..." }} />}
    >
      <DataTable columns={columns} rows={activeList} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có hạng mục nào trong nhóm này" resizable />

      {showForm && (
        <PurchaseFormModal
          editing={editing}
          members={members}
          centers={centers}
          pending={pending}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSubmit={handleSubmit}
        />
      )}
      <ConfirmDialog open={!!confirmDeleteId} title="Xoá hạng mục?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} mục đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

// Ported from openPmForm: full 19-field form (Phòng mua hàng / Người phụ
// trách / Trung tâm / Trạng thái selects + text fields).
function PurchaseFormModal({
  editing,
  members,
  centers,
  pending,
  onClose,
  onSubmit,
}: {
  editing: PurchaseItemRow | null
  members: Array<{ id: string; name: string }>
  centers: Array<{ id: string; name: string }>
  pending: boolean
  onClose: () => void
  onSubmit: (formData: FormData) => void
}) {
  return (
    <FormModal
      open
      title={editing ? "Chi tiết hạng mục mua hàng" : "Thêm hạng mục mua hàng"}
      onClose={onClose}
      onSubmit={() => { const f = document.getElementById("tf-purchase-form") as HTMLFormElement | null; if (f) onSubmit(new FormData(f)) }}
      submitting={pending}
      width={720}
    >
      <form id="tf-purchase-form" onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Phòng mua hàng
          <input name="pic" defaultValue={editing?.pic ?? ""} placeholder="PIC ngoài lab" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Người phụ trách
          <select name="owner" defaultValue={editing?.owner ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
            <option value="">— Chọn người phụ trách —</option>
            {members.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Trung tâm
          <select name="lab" defaultValue={editing?.lab ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
            <option value="">— Chọn trung tâm —</option>
            {centers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Trạng thái
          <select name="status" defaultValue={editing?.status ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
            {["", "On-going", "Done", "Chậm", "Hủy"].map((s) => <option key={s} value={s}>{s || "—"}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, fontWeight: 600, gridColumn: "1 / -1" }}>Tên hạng mục *
          <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
        </label>
        {FIELD_DEFS.map((f) => (
          <label key={f.key} style={{ fontSize: 12, fontWeight: 600, gridColumn: f.area ? "1 / -1" : undefined }}>
            {f.label}
            {f.area ? (
              <textarea name={String(f.key)} rows={2} defaultValue={(editing?.[f.key] as string) ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, fontFamily: "inherit" }} />
            ) : (
              <input name={String(f.key)} defaultValue={(editing?.[f.key] as string) ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            )}
          </label>
        ))}
      </form>
    </FormModal>
  )
}

export default PurchaseView
