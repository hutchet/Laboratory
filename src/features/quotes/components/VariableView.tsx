"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { CustomSelect } from "@/shared/ui/custom-select"
import { KpiCard } from "@/shared/ui/kpi-card"
import { Perm } from "@/shared/lib/rbac-client"
import { DirectionIcon } from "@/shared/ui/icons"
import { computeSimpleTrend } from "@/shared/lib/trend"
import { saveVariableCost, deleteVariableCost, bulkDeleteVariableCosts } from "../actions"
import type { VariableCostRow, Option } from "../types"

function fmtVND(n: number) {
  return Math.round(n || 0).toLocaleString("vi-VN")
}

const NO_CENTER_KEY = "__none__"
const NO_CENTER_LABEL = "Chưa gán trung tâm"

type CenterGroup = { key: string; name: string; centerId: string | null; items: VariableCostRow[] }

// y/c 4.2: Chi phí biến đổi chuyển sang mô hình danh sách thẻ theo Trung tâm —
// mỗi Trung tâm khai báo trong trang Trung tâm luôn có 1 thẻ (kể cả chưa có
// khoản chi phí nào), khoản chi phí chưa gán Trung tâm gộp vào thẻ riêng.
// Trang danh sách thẻ có 4 KPI.
export function VariableView({ items, centers = [] }: { items: VariableCostRow[]; centers?: Option[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<VariableCostRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [openCenterKey, setOpenCenterKey] = useState("")
  const [fCenterId, setFCenterId] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (showForm) setFCenterId(editing?.centerId ?? (openCenterKey && openCenterKey !== NO_CENTER_KEY ? openCenterKey : ""))
  }, [showForm, editing, openCenterKey])

  const groups: CenterGroup[] = useMemo(() => {
    const byCenter = new Map<string, VariableCostRow[]>()
    for (const it of items) {
      const key = it.centerId || NO_CENTER_KEY
      if (!byCenter.has(key)) byCenter.set(key, [])
      byCenter.get(key)!.push(it)
    }
    const list: CenterGroup[] = centers.map((c) => ({ key: c.id, name: c.name, centerId: c.id, items: byCenter.get(c.id) || [] }))
    const orphan = byCenter.get(NO_CENTER_KEY) || []
    if (orphan.length) list.push({ key: NO_CENTER_KEY, name: NO_CENTER_LABEL, centerId: null, items: orphan })
    return list
  }, [items, centers])

  const openGroup = groups.find((g) => g.key === openCenterKey) ?? null

  useEffect(() => {
    const el = document.getElementById("page-title")
    if (!el) return
    if (openGroup) {
      el.classList.add("title-back")
      el.title = "Quay lại danh sách trung tâm"
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
  }, [openGroup?.key])

  function openCenter(key: string) { setOpenCenterKey(key); setQ("") }
  function backToGrid() { setOpenCenterKey(""); setQ("") }

  const overview = useMemo(() => {
    const withAmount = items.filter((it) => it.amount != null)
    const totalCost = items.reduce((a, it) => a + (it.amount || 0), 0)
    const avgCost = withAmount.length ? totalCost / withAmount.length : 0
    return { total: items.length, centerCount: centers.length, totalCost, avgCost }
  }, [items, centers])

  // Trend theo data thuc (rule KPI global) — dua tren VariableCost.createdAt.
  const variableTrends = useMemo(() => ({
    total: computeSimpleTrend(items, () => true, (it) => it.createdAt),
  }), [items])

  const filtered = useMemo(() => {
    const list = openGroup ? openGroup.items : []
    return list.filter((it) => !q || it.costType.toLowerCase().includes(q.toLowerCase()))
  }, [openGroup, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: VariableCostRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      costType: String(formData.get("costType") || ""),
      description: String(formData.get("description") || ""),
      amount: formData.get("amount") ? Number(formData.get("amount")) : null,
      centerId: fCenterId || null,
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
  const allSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id))
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(filtered.map((it) => it.id))))
  }

  const columns: Array<DataTableColumn<VariableCostRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />, defaultWidth: 44,
          render: (it: VariableCostRow) => <input type="checkbox" checked={selected.has(it.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(it.id)} />,
        } as DataTableColumn<VariableCostRow>]
      : []),
    { key: "costType", header: "Loại chi phí", render: (it) => <span style={{ fontWeight: 600 }}>{it.costType}</span> },
    { key: "description", header: "Mô tả", render: (it) => it.description ?? "—" },
    { key: "amount", header: "Số tiền", align: "right", render: (it) => (it.amount != null ? it.amount.toLocaleString("vi-VN") : "—") },
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
    <PageShell title="Chi phí biến đổi khác" subtitle={openGroup ? undefined : "Chọn một trung tâm để xem chi phí biến đổi"}>
      {!openGroup && (
        <>
          <div className="kpis-tier" style={{ marginBottom: 16 }}>
            <KpiCard label="Tổng khoản mục" value={overview.total} tone="blue" trend={variableTrends.total} />
            <KpiCard label="Trung tâm" value={overview.centerCount} tone="blue" />
            <KpiCard label="Tổng chi phí" value={`${fmtVND(overview.totalCost)} đ`} tone="warning" />
            <KpiCard label="Chi phí trung bình" value={`${fmtVND(overview.avgCost)} đ`} tone="success" />
          </div>
          {groups.length === 0 ? (
            <div className="empty">Chưa có trung tâm nào — thêm trung tâm ở trang Trung tâm để tạo chi phí theo từng trung tâm.</div>
          ) : (
            <div className="cu-grid">
              {groups.map((g) => {
                const val = g.items.reduce((a, it) => a + (it.amount || 0), 0)
                const withAmount = g.items.filter((it) => it.amount != null)
                const avgVal = withAmount.length ? val / withAmount.length : 0
                const initial = g.name.replace(/Trung tâm|thử nghiệm/gi, "").trim().slice(0, 2).toUpperCase() || "TT"
                return (
                  <div key={g.key} className="hub-card" onClick={() => openCenter(g.key)} style={{ cursor: "pointer" }}>
                    <div className="hub-top">
                      <div className="hub-icon">{initial}</div>
                      <div className="hub-title"><h4>{g.name}</h4><p>{g.items.length} khoản mục · {fmtVND(val)} đ</p></div>
                      <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                    </div>
                    <div className="hub-stats">
                      <div className="hub-stat"><b>{g.items.length}</b><span>Khoản mục</span></div>
                      <div className="hub-stat"><b>{withAmount.length}</b><span>Có giá trị</span></div>
                      <div className="hub-stat"><b>{fmtVND(avgVal)} đ</b><span>CP TB</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {openGroup && (
        <>
          <div className="section-head">
            <h3>{openGroup.name}</h3>
            <div className="tools">
              <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm chi phí..." }} />
              <span style={{ display: "flex", gap: 8 }}>
                {editMode && (
                  <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xoá tất cả</button>
                )}
                <Perm minPerm="dept_head">
                  <button type="button" className={editMode ? "btn-success" : "btn-line"} onClick={toggleEditMode}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
                  <button type="button" className="btn-pri" onClick={openNew}>+ Thêm chi phí</button>
                </Perm>
              </span>
            </div>
          </div>
          <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có chi phí nào" onRowClick={(it) => openEdit(it)} resizable maxBodyHeight={560} />
        </>
      )}

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
          <label style={{ fontSize: 12, fontWeight: 600 }}>Trung tâm
            <CustomSelect value={fCenterId} onChange={setFCenterId} width="100%" options={[{ value: "", label: NO_CENTER_LABEL }, ...centers.map((c) => ({ value: c.id, label: c.name }))]} />
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
