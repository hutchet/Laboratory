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
import { saveTestCatalogItem, deleteTestCatalogItem, bulkDeleteTestCatalogItems } from "../actions"
import type { TestCatalogRow, PersonnelRateConfigRow, PersonnelRoutingRow, Option } from "../types"
import { useCurrency } from "@/shared/ui/currency-provider"

function parseHours(v: string | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Ported (partial) from openQuoteBreakdown(): tính chi phí nhân công từ giờ công
// định tuyến (PersonnelRouting) khớp theo mã bài thử, nhân với đơn giá KTV và
// cộng phụ phí chung. Phần khấu hao thiết bị/điện/nhà xưởng (qtMachineKH/
// qtMachineElec/qtMachineNX trong bản gốc) cần ma trận thiết bị theo mã bài
// thử (đợt sau) nên chưa tính ở đây — được ghi rõ trong modal.
function computeCatalogBreakdown(item: TestCatalogRow, routing: PersonnelRoutingRow[], config: PersonnelRateConfigRow) {
  const match = routing.find((r) => !!item.code && !!r.testCode && r.testCode.trim().toLowerCase() === item.code!.trim().toLowerCase())
  const prepHours = parseHours(match?.prepHours)
  const setupHours = parseHours(match?.setupHours)
  const testHours = parseHours(match?.testHours)
  const reportHours = parseHours(match?.reportHours)
  const totalHours = prepHours + setupHours + testHours + reportHours
  const laborCost = totalHours * config.techRate
  const overhead = laborCost * (config.overheadPct / 100)
  const computedTotal = laborCost + overhead
  return { match, prepHours, setupHours, testHours, reportHours, totalHours, laborCost, overhead, computedTotal }
}

const NO_CENTER_KEY = "__none__"
const NO_CENTER_LABEL = "Chưa gán trung tâm"

type CenterGroup = { key: string; name: string; centerId: string | null; items: TestCatalogRow[] }

// y/c 4.2 (đợt mới): Danh mục báo giá chuyển sang mô hình danh sách thẻ theo
// Trung tâm (giống Ma trận báo giá/Khấu hao thiết bị) — mỗi Trung tâm khai báo
// trong trang Trung tâm luôn có 1 thẻ (kể cả chưa có bài thử nào), bài thử chưa
// gán Trung tâm gộp vào thẻ "Chưa gán trung tâm". Trang danh sách thẻ có 4 KPI.
export function CatalogView({ items, personnelConfig, routing, centers = [] }: { items: TestCatalogRow[]; personnelConfig: PersonnelRateConfigRow; routing: PersonnelRoutingRow[]; centers?: Option[] }) {
  const { format: fmtVND } = useCurrency()
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<TestCatalogRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [breakdownItem, setBreakdownItem] = useState<TestCatalogRow | null>(null)
  const [openCenterKey, setOpenCenterKey] = useState("")
  const [fCenterId, setFCenterId] = useState("")
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (showForm) setFCenterId(editing?.centerId ?? (openCenterKey && openCenterKey !== NO_CENTER_KEY ? openCenterKey : ""))
  }, [showForm, editing, openCenterKey])

  // Trend theo data thuc — dua tren TestCatalogItem.createdAt
  const catalogTrends = useMemo(() => ({
    total: computeSimpleTrend(items, () => true, (it) => it.createdAt),
    withPrice: computeSimpleTrend(items, (it) => it.price != null, (it) => it.createdAt),
  }), [items])

  const groups: CenterGroup[] = useMemo(() => {
    const byCenter = new Map<string, TestCatalogRow[]>()
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
    const withPrice = items.filter((it) => it.price != null)
    const avgPrice = withPrice.length ? withPrice.reduce((a, it) => a + (it.price || 0), 0) / withPrice.length : 0
    const totalValue = items.reduce((a, it) => a + (it.price || 0), 0)
    return { total: items.length, centerCount: centers.length, avgPrice, totalValue }
  }, [items, centers])

  const filtered = useMemo(() => {
    const list = openGroup ? openGroup.items : []
    return list.filter((it) => !q || it.name.toLowerCase().includes(q.toLowerCase()))
  }, [openGroup, q])

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
      centerId: fCenterId || null,
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
  const allSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id))
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(filtered.map((it) => it.id))))
  }

  const columns: Array<DataTableColumn<TestCatalogRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />, defaultWidth: 44,
          render: (it: TestCatalogRow) => <input type="checkbox" checked={selected.has(it.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(it.id)} />,
        } as DataTableColumn<TestCatalogRow>]
      : []),
    { key: "code", header: "Mã", render: (it) => it.code ?? "—" },
    { key: "name", header: "Tên bài thử", render: (it) => <span style={{ fontWeight: 600 }}>{it.name}</span> },
    { key: "standard", header: "Tiêu chuẩn", render: (it) => it.standard ?? "—" },
    { key: "sampleQty", header: "Cấp mẫu", render: (it) => it.sampleQty ?? "—" },
    { key: "leadTime", header: "Thời gian xử lý", render: (it) => it.leadTime ?? "—" },
    { key: "price", header: "Đơn giá", align: "right", render: (it) => (it.price != null ? fmtVND(it.price) : "—") },
    {
      key: "actions", header: "", align: "right",
      render: (it) => (
        <span className="acts" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="txt-act" onClick={() => setBreakdownItem(it)}>Cấu thành giá</button>
          {editMode && (
            <Perm minPerm="dept_head">
              <button type="button" className="txt-act pri" onClick={() => openEdit(it)}>Sửa</button>
              <button type="button" className="txt-act del" onClick={() => setConfirmDeleteId(it.id)}>Xoá</button>
            </Perm>
          )}
        </span>
      ),
    },
  ]

  return (
    <PageShell title="Danh mục bài thử nghiệm" subtitle={openGroup ? undefined : "Chọn một trung tâm để xem danh mục bài thử"}>
      {!openGroup && (
        <>
          <div className="kpis-tier" style={{ marginBottom: 16 }}>
            <KpiCard label="Tổng bài thử" value={overview.total} tone="blue" trend={catalogTrends.total} />
            <KpiCard label="Trung tâm" value={overview.centerCount} tone="blue" />
            <KpiCard label="Đơn giá trung bình" value={fmtVND(overview.avgPrice)} tone="warning" trend={catalogTrends.withPrice} />
            <KpiCard label="Tổng giá trị danh mục" value={fmtVND(overview.totalValue)} tone="success" />
          </div>
          {groups.length === 0 ? (
            <div className="empty">Chưa có trung tâm nào — thêm trung tâm ở trang Trung tâm để tạo danh mục theo từng trung tâm.</div>
          ) : (
            <div className="cu-grid">
              {groups.map((g) => {
                const withPrice = g.items.filter((it) => it.price != null)
                const val = withPrice.reduce((a, it) => a + (it.price || 0), 0)
                const avgVal = withPrice.length ? val / withPrice.length : 0
                const initial = g.name.replace(/Trung tâm|thử nghiệm/gi, "").trim().slice(0, 2).toUpperCase() || "TT"
                return (
                  <div key={g.key} className="hub-card" onClick={() => openCenter(g.key)} style={{ cursor: "pointer" }}>
                    <div className="hub-top">
                      <div className="hub-icon">{initial}</div>
                      <div className="hub-title"><h4>{g.name}</h4><p>{g.items.length} bài thử · {fmtVND(val)}</p></div>
                      <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                    </div>
                    <div className="hub-stats">
                      <div className="hub-stat"><b>{g.items.length}</b><span>Bài thử</span></div>
                      <div className="hub-stat"><b>{withPrice.length}</b><span>Có giá</span></div>
                      <div className="hub-stat"><b>{fmtVND(avgVal)}</b><span>Đơn giá TB</span></div>
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
              <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm bài thử..." }} />
              <span style={{ display: "flex", gap: 8 }}>
                {editMode && (
                  <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xoá tất cả</button>
                )}
                <Perm minPerm="dept_head">
                  <button type="button" className={editMode ? "btn-success" : "btn-line"} onClick={toggleEditMode}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
                  <button type="button" className="btn-pri" onClick={openNew}>+ Thêm bài thử</button>
                </Perm>
              </span>
            </div>
          </div>
          <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có bài thử nào" onRowClick={(it) => openEdit(it)} resizable maxBodyHeight={560} />
        </>
      )}

      <FormModal
        open={showForm}
        title={editing ? "Sửa bài thử" : "Thêm bài thử"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-catalog-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-catalog-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mã
              <input name="code" defaultValue={editing?.code ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 2 }}>Tên bài thử *
              <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Trung tâm
            <CustomSelect value={fCenterId} onChange={setFCenterId} width="100%" options={[{ value: "", label: NO_CENTER_LABEL }, ...centers.map((c) => ({ value: c.id, label: c.name }))]} />
          </label>
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

      {breakdownItem && (() => {
        const b = computeCatalogBreakdown(breakdownItem, routing, personnelConfig)
        const rows: Array<[string, string]> = [
          ["Giờ chuẩn bị (prep)", `${b.prepHours} giờ`],
          ["Giờ chuẩn bị máy (setup)", `${b.setupHours} giờ`],
          ["Giờ thử nghiệm (test)", `${b.testHours} giờ`],
          ["Giờ báo cáo (report)", `${b.reportHours} giờ`],
          ["Tổng giờ công", `${b.totalHours} giờ`],
          ["Định mức KTV", `${fmtVND(personnelConfig.techRate)}/giờ`],
          ["Chi phí nhân công", fmtVND(b.laborCost)],
          ["Phụ phí chung", `${personnelConfig.overheadPct}% = ${fmtVND(b.overhead)}`],
          ["Tổng chi phí tính toán (nhân công)", fmtVND(b.computedTotal)],
          ["Đơn giá đã nhập", breakdownItem.price != null ? fmtVND(breakdownItem.price) : "—"],
        ]
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(15,18,22,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
            onClick={() => setBreakdownItem(null)}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 20, width: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Cấu thành giá: {breakdownItem.name}</div>
                <button type="button" className="modal-x" onClick={() => setBreakdownItem(null)} aria-label="Đóng">✕</button>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>
                {b.match ? `Khớp giờ công theo mã “${breakdownItem.code}” từ Định tuyến nhân sự.` : "Chưa có định tuyến giờ công khớp mã này — giờ công = 0."}
              </div>
              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <tbody>
                  {rows.map(([label, val]) => (
                    <tr key={label} style={{ borderBottom: "1px solid #f0f1f3" }}>
                      <td style={{ padding: "6px 0", opacity: 0.75 }}>{label}</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fff7e6", fontSize: 12, color: "#7a5c00" }}>
                Chú ý: chi phí khấu hao thiết bị, điện và nhà xưởng (qtMachineKH/qtMachineElec/qtMachineNX trong bản gốc) chưa được tính vào đây vì cần cấu hình ma trận thiết bị theo mã bài thử (đợt sau).
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" onClick={() => setBreakdownItem(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff" }}>Đóng</button>
              </div>
            </div>
          </div>
        )
      })()}
    </PageShell>
  )
}

export default CatalogView
