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
    noPrice: computeSimpleTrend(items, (it) => it.price == null, (it) => it.createdAt),
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
    return { total: items.length, missingPrice: items.length - withPrice.length, avgPrice, totalValue }
  }, [items, centers])

  // y/c item3 (bo sung the KPI cho trang chi tiet trung tam): tinh rieng cho
  // nhom (trung tam) dang mo, khong dung so lieu toan cuc cua overview.
  const groupOverview = useMemo(() => {
    const groupItems = openGroup ? openGroup.items : []
    const withPrice = groupItems.filter((it) => it.price != null)
    const avgPrice = withPrice.length ? withPrice.reduce((a, it) => a + (it.price || 0), 0) / withPrice.length : 0
    const totalValue = groupItems.reduce((a, it) => a + (it.price || 0), 0)
    return { total: groupItems.length, missingPrice: groupItems.length - withPrice.length, avgPrice, totalValue }
  }, [openGroup])

  const filtered = useMemo(() => {
    const list = openGroup ? openGroup.items : []
    return list.filter((it) => !q || it.name.toLowerCase().includes(q.toLowerCase()))
  }, [openGroup, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: TestCatalogRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const num = (key: string) => (formData.get(key) ? Number(formData.get(key)) : null)
    const input = {
      id: editing?.id,
      code: String(formData.get("code") || ""),
      name: String(formData.get("name") || ""),
      standard: String(formData.get("standard") || ""),
      phong: String(formData.get("phong") || ""),
      sampleQty: String(formData.get("sampleQty") || ""),
      leadTime: String(formData.get("leadTime") || ""),
      price: formData.get("price") ? Number(formData.get("price")) : null,
      centerId: fCenterId || null,
      group1: String(formData.get("group1") || ""),
      group2: String(formData.get("group2") || ""),
      vts: String(formData.get("vts") || ""),
      standardDays: num("standardDays"),
      priceCatarcQc: num("priceCatarcQc"),
      priceIdiadaChina: num("priceIdiadaChina"),
      priceIdiadaSpain: num("priceIdiadaSpain"),
      priceMira: num("priceMira"),
      priceCalspan: num("priceCalspan"),
      priceImat: num("priceImat"),
      estimatedHours: num("estimatedHours"),
      machineHours: num("machineHours"),
      personnelHours: num("personnelHours"),
      gapTiming: num("gapTiming"),
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
    { key: "phong", header: "Phòng", render: (it) => it.phong ?? "—" },
    { key: "group1", header: "Nhóm 1", render: (it) => it.group1 ?? "—" },
    { key: "group2", header: "Nhóm 2", render: (it) => it.group2 ?? "—" },
    { key: "vts", header: "VTS", render: (it) => it.vts ?? "—" },
    { key: "sampleQty", header: "Cấp mẫu", render: (it) => it.sampleQty ?? "—" },
    { key: "leadTime", header: "Thời gian xử lý", render: (it) => it.leadTime ?? "—" },
    { key: "standardDays", header: "TG chuẩn (ngày)", align: "right", render: (it) => it.standardDays ?? "—" },
    { key: "price", header: "Đơn giá (VinFast)", align: "right", render: (it) => (it.price != null ? fmtVND(it.price) : "—") },
    { key: "priceCatarcQc", header: "CATARC QC", align: "right", render: (it) => (it.priceCatarcQc != null ? fmtVND(it.priceCatarcQc) : "—") },
    { key: "priceIdiadaChina", header: "IDIADA China", align: "right", render: (it) => (it.priceIdiadaChina != null ? fmtVND(it.priceIdiadaChina) : "—") },
    { key: "priceIdiadaSpain", header: "IDIADA Spain", align: "right", render: (it) => (it.priceIdiadaSpain != null ? fmtVND(it.priceIdiadaSpain) : "—") },
    { key: "priceMira", header: "MIRA", align: "right", render: (it) => (it.priceMira != null ? fmtVND(it.priceMira) : "—") },
    { key: "priceCalspan", header: "CALSPAN", align: "right", render: (it) => (it.priceCalspan != null ? fmtVND(it.priceCalspan) : "—") },
    { key: "priceImat", header: "IMAT", align: "right", render: (it) => (it.priceImat != null ? fmtVND(it.priceImat) : "—") },
    { key: "estimatedHours", header: "TG dự kiến (h)", align: "right", render: (it) => it.estimatedHours ?? "—" },
    { key: "machineHours", header: "TG máy chạy", align: "right", render: (it) => it.machineHours ?? "—" },
    { key: "personnelHours", header: "TG NS triển khai", align: "right", render: (it) => it.personnelHours ?? "—" },
    { key: "gapTiming", header: "Gap timing", align: "right", render: (it) => it.gapTiming ?? "—" },
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
            <KpiCard label="Chưa có đơn giá" value={overview.missingPrice} tone="danger" trend={catalogTrends.noPrice} />
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
          <div className="kpis-tier" style={{ marginBottom: 16 }}>
            <KpiCard label="Bài thử trong trung tâm" value={groupOverview.total} tone="blue" />
            <KpiCard label="Chưa có đơn giá" value={groupOverview.missingPrice} tone="danger" />
            <KpiCard label="Đơn giá trung bình" value={fmtVND(groupOverview.avgPrice)} tone="warning" />
            <KpiCard label="Tổng giá trị nhóm" value={fmtVND(groupOverview.totalValue)} tone="success" />
          </div>
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
          <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có bài thử nào" onRowClick={(it) => openEdit(it)} resizable maxBodyHeight={560} fillHeight />
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
          <label style={{ fontSize: 12, fontWeight: 600 }}>Phòng
            <input name="phong" defaultValue={editing?.phong ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Nhóm 1
              <input name="group1" defaultValue={editing?.group1 ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Nhóm 2
              <input name="group2" defaultValue={editing?.group2 ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>VTS
              <input name="vts" defaultValue={editing?.vts ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số lượng mẫu
              <input name="sampleQty" defaultValue={editing?.sampleQty ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Thời gian
              <input name="leadTime" defaultValue={editing?.leadTime ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>TG chuẩn (ngày)
              <input type="number" step="any" name="standardDays" defaultValue={editing?.standardDays ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Đơn giá (VinFast)
              <input type="number" name="price" defaultValue={editing?.price ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>CATARC QC
              <input type="number" name="priceCatarcQc" defaultValue={editing?.priceCatarcQc ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>IDIADA China
              <input type="number" name="priceIdiadaChina" defaultValue={editing?.priceIdiadaChina ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>IDIADA Spain
              <input type="number" name="priceIdiadaSpain" defaultValue={editing?.priceIdiadaSpain ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>MIRA
              <input type="number" name="priceMira" defaultValue={editing?.priceMira ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>CALSPAN
              <input type="number" name="priceCalspan" defaultValue={editing?.priceCalspan ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>IMAT
              <input type="number" name="priceImat" defaultValue={editing?.priceImat ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>TG dự kiến (h)
              <input type="number" step="any" name="estimatedHours" defaultValue={editing?.estimatedHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>TG máy chạy
              <input type="number" step="any" name="machineHours" defaultValue={editing?.machineHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>TG NS triển khai
              <input type="number" step="any" name="personnelHours" defaultValue={editing?.personnelHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Gap timing
              <input type="number" step="any" name="gapTiming" defaultValue={editing?.gapTiming ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
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
            <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card, var(--surface-large, #fff))", color: "var(--ink)", borderRadius: 12, padding: 20, width: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.35)", border: "1px solid var(--line)" }}>
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
                    <tr key={label} style={{ borderBottom: "1px solid var(--line)" }}>
                      <td style={{ padding: "6px 0", opacity: 0.75 }}>{label}</td>
                      <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "color-mix(in srgb, var(--amber, #e8932a) 18%, var(--card, #fff))", fontSize: 12, color: "var(--ink)" }}>
                Chú ý: chi phí khấu hao thiết bị, điện và nhà xưởng (qtMachineKH/qtMachineElec/qtMachineNX trong bản gốc) chưa được tính vào đây vì cần cấu hình ma trận thiết bị theo mã bài thử (đợt sau).
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button type="button" onClick={() => setBreakdownItem(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line)", background: "var(--surface-control, #fff)", color: "var(--ink)" }}>Đóng</button>
              </div>
            </div>
          </div>
        )
      })()}
    </PageShell>
  )
}

export default CatalogView
