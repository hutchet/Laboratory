"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { CustomSelect } from "@/shared/ui/custom-select"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { KpiCard } from "@/shared/ui/kpi-card"
import { computeSimpleTrend } from "@/shared/lib/trend"
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
  // Port cua eqCenterEditMode/EquipmentView (che do sua chi ap dung trong pham
  // vi 1 nhom dang mo, khong con la nut o dau trang toan cuc).
  const [editMode, setEditMode] = useState(false)
  function toggleEditMode() {
    setEditMode((v) => { if (v) setSelected(new Set()); return !v })
  }

  // Port cua #page-title.title-back (EquipmentView/DepreciationView): khi da mo
  // 1 nhom, tieu de tren topbar tro thanh nut back thay cho nut rieng "Danh sach nhom".
  useEffect(() => {
    const el = document.getElementById("page-title")
    if (!el) return
    if (openGroup) {
      el.classList.add("title-back")
      el.title = "Quay lại danh sách nhóm"
      const handler = () => { setOpenGroup(null); setEditMode(false); setSelected(new Set()) }
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
  }, [openGroup])

  // ---- KPI (ported from pm-k-total / pm-k-value / pm-k-ongoing / pm-k-done) ----
  const totalValue = useMemo(() => items.reduce((s, it) => s + purchaseParseAmount(it.amount), 0), [items])
  const ongoingCount = items.filter((it) => it.status === "On-going").length
  const doneCount = items.filter((it) => it.status === "Done").length

  // ---- KPI trends ----
  const trendTotal = useMemo(() => computeSimpleTrend(items, () => true, (it) => it.createdAt), [items])
  const trendOngoing = useMemo(() => computeSimpleTrend(items, (it) => it.status === "On-going", (it) => it.createdAt), [items])
  const trendDone = useMemo(() => computeSimpleTrend(items, (it) => it.status === "Done", (it) => it.createdAt), [items])
  // Trend for total value: sum amount per week instead of count
  const trendValue = useMemo(() => {
    const now = Date.now()
    const day = 86400000
    function valSnapshot(asOfMs: number) {
      return items.filter((it) => new Date(it.createdAt).getTime() <= asOfMs)
        .reduce((a, it) => a + purchaseParseAmount(it.amount), 0)
    }
    function pctChg(curr: number, prev: number): { pct: number; up: boolean | null } {
      if (prev === 0) return curr === 0 ? { pct: 0, up: null } : { pct: 100, up: true }
      const pct = Math.round(((curr - prev) / prev) * 100)
      if (pct === 0) return { pct: 0, up: true }
      return { pct: Math.abs(pct), up: pct >= 0 }
    }
    function sparklineFor() {
      const pts: number[] = []
      for (let i = 6; i >= 0; i--) pts.push(valSnapshot(now - i * day))
      return pts
    }
    const curr = valSnapshot(now)
    const prev = valSnapshot(now - 7 * day)
    const base = pctChg(curr, prev)
    return { pct: base.pct, up: base.up, sparkline: sparklineFor() }
  }, [items])

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
  // Port cua .row-chk/.selall-chk/.acts (globals.css dong 350-353): trong ban
  // goc 2 cot nay LUON co trong DOM/chiem dung do rong cot, chi an bang
  // visibility:hidden khi khong o che do Chinh sua (khong xoa het cot nhu
  // truoc, vi vay do rong bang khong bi nhay khi bam Chinh sua/Xong).
  const columns: Array<DataTableColumn<PurchaseItemRow>> = [
    {
      key: "sel", header: "", defaultWidth: 44,
      render: (it) => editMode ? <input type="checkbox" checked={selected.has(it.id)} onChange={() => toggleSelect(it.id)} onClick={(ev) => ev.stopPropagation()} /> : null,
    },
    // Port cua cot "STT" (dong 5892 ban goc, giua checkbox va Ten hang muc) -
    // truoc day bi bo sot khi build lai bang.
    { key: "stt", header: "STT", defaultWidth: 56, render: (it) => activeList.findIndex((x) => x.id === it.id) + 1 },
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
      render: (it) => editMode ? (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(ev) => ev.stopPropagation()}>
          <button type="button" className="txt-act pri" onClick={() => openEdit(it)}>Sửa</button>
          <button type="button" className="txt-act del" onClick={() => setConfirmDeleteId(it.id)}>Xoá</button>
        </span>
      ) : null,
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
          <button type="button" className="btn-line" onClick={exportCsv} style={{ marginRight: 8 }}>Xuất CSV</button>
          <button type="button" className="btn-pri" onClick={openNew}>+ Thêm hạng mục</button>
        </>}
        filters={<span style={{ display: "flex", gap: 8 }}>
          {(Object.keys(PURCHASE_GROUPBY_LABEL) as PurchaseGroupBy[]).map((g) => (
            <button
              key={g}
              type="button"
              className={groupBy === g ? "btn-pri" : "btn-line"}
              onClick={() => setGroupBy(g)}
            >
              Theo {PURCHASE_GROUPBY_LABEL[g]}
            </button>
          ))}
        </span>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
          <KpiCard label="Tổng hạng mục" value={items.length} tone="blue" trend={trendTotal} />
          <KpiCard label="Tổng giá trị" value={`${purchaseFormatAmount(totalValue)} đ`} tone="danger" trend={trendValue} />
          <KpiCard label="Đang triển khai" value={ongoingCount} tone="warning" trend={trendOngoing} />
          <KpiCard label="Hoàn thành" value={doneCount} tone="success" trend={trendDone} />
        </div>

        {!items.length ? (
          <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Chưa có hạng mục mua hàng nào</div>
        ) : (
          <div id="eq-center-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
            {groups.map(([key, list]) => {
              const val = list.reduce((s, it) => s + purchaseParseAmount(it.amount), 0)
              const done = list.filter((it) => it.status === "Done").length
              const ongoing = list.filter((it) => it.status === "On-going").length
              const cham = list.filter((it) => it.status === "Chậm").length
              const initial = key.replace(/Trung tâm|thử nghiệm/gi, "").trim().slice(0, 2).toUpperCase() || "TT"
              return (
                <div key={key} className="hub-card" onClick={() => setOpenGroup(key)}>
                  <div className="hub-top">
                    <div className="hub-icon">{initial}</div>
                    <div className="hub-title"><h4>{key}</h4><p>{list.length} hạng mục · {purchaseFormatAmount(val)} đ</p></div>
                    <span className="hub-arrow sys-arrow-glyph">›</span>
                  </div>
                  <div className="hub-tags">
                    <span className="hub-tag">{done} hoàn thành</span>
                    <span className="hub-tag">{ongoing} đang triển khai</span>
                    {cham > 0 && <span className="hub-tag" style={{ color: "var(--red)" }}>{cham} chậm</span>}
                  </div>
                  <div className="hub-stats">
                    <div className="hub-stat"><b>{list.length}</b><span>Hạng mục</span></div>
                    <div className="hub-stat"><b style={{ color: "var(--green)" }}>{done}</b><span>Hoàn thành</span></div>
                    <div className="hub-stat"><b style={{ color: "var(--orange, #f59e0b)" }}>{ongoing}</b><span>Đang triển khai</span></div>
                  </div>
                </div>
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
        <button type="button" className="btn-line" onClick={exportCsv} style={{ marginRight: 8 }}>Xuất CSV</button>
        {editMode && selected.size > 0 && (
          <button type="button" className="btn-danger" onClick={() => setBulkConfirm(true)} style={{ marginRight: 8 }}>Xoá {selected.size} mục đã chọn</button>
        )}
        <button type="button" className="btn-line" onClick={toggleEditMode} style={{ marginRight: 8 }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
        <button type="button" className="btn-pri" onClick={openNew}>+ Thêm hạng mục</button>
      </>}
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm hạng mục..." }} />}
    >
      <DataTable columns={columns} rows={activeList} rowKey={(it) => it.id} onRowClick={openEdit} loading={pending} emptyTitle="Chưa có hạng mục nào trong nhóm này" resizable maxBodyHeight={560} />

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
  const [pOwner, setPOwner] = useState(editing?.owner ?? "")
  const [pLab, setPLab] = useState(editing?.lab ?? "")
  const [pStatus, setPStatus] = useState(editing?.status ?? "")

  return (
    <FormModal
      open
      title={editing ? "Chi tiết hạng mục mua hàng" : "Thêm hạng mục mua hàng"}
      onClose={onClose}
      onSubmit={() => { const f = document.getElementById("tf-purchase-form") as HTMLFormElement | null; if (f) onSubmit(new FormData(f)) }}
      submitting={pending}
      width={720}
    >
      <form key={editing?.id ?? "new"} id="tf-purchase-form" onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <input type="hidden" name="owner" value={pOwner} />
        <input type="hidden" name="lab" value={pLab} />
        <input type="hidden" name="status" value={pStatus} />
        <div className="field">
          <label>Phòng mua hàng</label>
          <input name="pic" defaultValue={editing?.pic ?? ""} placeholder="PIC ngoài lab" />
        </div>
        <div className="field">
          <label>Người phụ trách</label>
          <CustomSelect value={pOwner} onChange={setPOwner} width="100%" options={[{ value: "", label: "— Chọn người phụ trách —" }, ...members.map((m) => ({ value: m.name, label: m.name }))]} />
        </div>
        <div className="field">
          <label>Trung tâm</label>
          <CustomSelect value={pLab} onChange={setPLab} width="100%" options={[{ value: "", label: "— Chọn trung tâm —" }, ...centers.map((c) => ({ value: c.name, label: c.name }))]} />
        </div>
        <div className="field">
          <label>Trạng thái</label>
          <CustomSelect value={pStatus} onChange={setPStatus} width="100%" options={["", "On-going", "Done", "Chậm", "Hủy"].map((s) => ({ value: s, label: s || "—" }))} />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Tên hạng mục *</label>
          <input name="name" required defaultValue={editing?.name ?? ""} />
        </div>
        {FIELD_DEFS.map((f) => (
          <div key={f.key} className="field" style={{ gridColumn: f.area ? "1 / -1" : undefined }}>
            <label>{f.label}</label>
            {f.area ? (
              <textarea name={String(f.key)} rows={2} defaultValue={(editing?.[f.key] as string) ?? ""} />
            ) : (
              <input name={String(f.key)} defaultValue={(editing?.[f.key] as string) ?? ""} />
            )}
          </div>
        ))}
      </form>
    </FormModal>
  )
}

export default PurchaseView
