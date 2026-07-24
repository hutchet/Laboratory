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
import { savePersonnelRateConfig, savePersonnelRouting, deletePersonnelRouting, bulkDeletePersonnelRouting } from "../actions"
import type { PersonnelRateConfigRow, PersonnelRoutingRow, Option } from "../types"
import { useCurrency } from "@/shared/ui/currency-provider"

function parseHours(v: string | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

// Bản gốc (renderQuotePersonnel) tách giờ công theo 3 vai trò (T/E/L) cho mỗi
// bước; schema PersonnelRouting hiện chỉ lưu tổng giờ theo bước (không tách
// vai trò), nên bảng dưới đây tính "Tổng giờ" và "CP nhân sự" quy đổi theo đơn
// giá kỹ thuật viên thay vì hiển thị 3 cột T/E/L riêng — giữ đúng ý nghĩa số
// liệu trong khi khớp với dữ liệu đang có.
function computeRoutingCost(it: PersonnelRoutingRow, config: PersonnelRateConfigRow) {
  const totalHours = parseHours(it.prepHours) + parseHours(it.setupHours) + parseHours(it.testHours) + parseHours(it.reportHours)
  const laborCost = totalHours * config.techRate
  const withOverhead = laborCost * (1 + config.overheadPct / 100)
  return { totalHours, withOverhead }
}

const NO_CENTER_KEY = "__none__"
const NO_CENTER_LABEL = "Chưa gán trung tâm"

type CenterGroup = { key: string; name: string; centerId: string | null; items: PersonnelRoutingRow[] }

// y/c 4.2: Nhân sự báo giá chuyển sang mô hình danh sách thẻ theo Trung tâm —
// mỗi Trung tâm khai báo trong trang Trung tâm luôn có 1 thẻ (kể cả chưa có
// định tuyến nào), định tuyến chưa gán Trung tâm gộp vào thẻ riêng. Trang
// danh sách thẻ có 4 KPI.
export function PersonnelView({ config, routing, centers = [] }: { config: PersonnelRateConfigRow; routing: PersonnelRoutingRow[]; centers?: Option[] }) {
  const { format: fmtVND } = useCurrency()
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<PersonnelRoutingRow | null>(null)
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
    const byCenter = new Map<string, PersonnelRoutingRow[]>()
    for (const it of routing) {
      const key = it.centerId || NO_CENTER_KEY
      if (!byCenter.has(key)) byCenter.set(key, [])
      byCenter.get(key)!.push(it)
    }
    const list: CenterGroup[] = centers.map((c) => ({ key: c.id, name: c.name, centerId: c.id, items: byCenter.get(c.id) || [] }))
    const orphan = byCenter.get(NO_CENTER_KEY) || []
    if (orphan.length) list.push({ key: NO_CENTER_KEY, name: NO_CENTER_LABEL, centerId: null, items: orphan })
    return list
  }, [routing, centers])

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
    const totalHours = routing.reduce((a, it) => a + computeRoutingCost(it, config).totalHours, 0)
    const totalCost = routing.reduce((a, it) => a + computeRoutingCost(it, config).withOverhead, 0)
    const avgHours = routing.length ? totalHours / routing.length : 0
    const missingHours = routing.filter((it) => computeRoutingCost(it, config).totalHours === 0).length
    return { total: routing.length, missingHours, avgHours, totalCost }
  }, [routing, centers, config])

  const groupOverview = useMemo(() => {
    const groupItems = openGroup ? openGroup.items : []
    const totalHours = groupItems.reduce((a, it) => a + computeRoutingCost(it, config).totalHours, 0)
    const totalCost = groupItems.reduce((a, it) => a + computeRoutingCost(it, config).withOverhead, 0)
    const avgHours = groupItems.length ? totalHours / groupItems.length : 0
    const missingHours = groupItems.filter((it) => computeRoutingCost(it, config).totalHours === 0).length
    return { total: groupItems.length, missingHours, avgHours, totalCost }
  }, [openGroup, config])

  // Trend theo data thuc (rule KPI global) — dua tren PersonnelRouting.createdAt.
  const personnelTrends = useMemo(() => ({
    total: computeSimpleTrend(routing, () => true, (it) => it.createdAt),
    noHours: computeSimpleTrend(routing, (it) => computeRoutingCost(it, config).totalHours === 0, (it) => it.createdAt),
  }), [routing, config])

  const filtered = useMemo(() => {
    const list = openGroup ? openGroup.items : []
    return list.filter((it) => !q || it.testName.toLowerCase().includes(q.toLowerCase()))
  }, [openGroup, q])

  function saveRates(formData: FormData) {
    const input = {
      techRate: Number(formData.get("techRate") || 0),
      engRate: Number(formData.get("engRate") || 0),
      leadRate: Number(formData.get("leadRate") || 0),
      mgrRate: Number(formData.get("mgrRate") || 0),
      overheadPct: Number(formData.get("overheadPct") || 0),
    }
    startTransition(async () => { await savePersonnelRateConfig(input) })
  }

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(it: PersonnelRoutingRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const s = (key: string) => String(formData.get(key) || "")
    const input = {
      id: editing?.id,
      testCode: String(formData.get("testCode") || ""),
      testName: String(formData.get("testName") || ""),
      prepHours: String(formData.get("prepHours") || ""),
      setupHours: String(formData.get("setupHours") || ""),
      testHours: String(formData.get("testHours") || ""),
      reportHours: String(formData.get("reportHours") || ""),
      centerId: fCenterId || null,
      group1: s("group1"),
      group2: s("group2"),
      phong: s("phong"),
      vts: s("vts"),
      standard: s("standard"),
      prepTechHours: s("prepTechHours"),
      prepEngHours: s("prepEngHours"),
      prepLeadHours: s("prepLeadHours"),
      setupTechHours: s("setupTechHours"),
      setupEngHours: s("setupEngHours"),
      setupLeadHours: s("setupLeadHours"),
      testTechHours: s("testTechHours"),
      testEngHours: s("testEngHours"),
      testLeadHours: s("testLeadHours"),
      reportTechHours: s("reportTechHours"),
      reportEngHours: s("reportEngHours"),
      reportLeadHours: s("reportLeadHours"),
    }
    startTransition(async () => { await savePersonnelRouting(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deletePersonnelRouting(id); setConfirmDeleteId(null) })
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
    startTransition(async () => { await bulkDeletePersonnelRouting(ids); setSelected(new Set()); setBulkConfirm(false) })
  }
  const allSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.id))
  function toggleSelectAll() {
    setSelected((prev) => (allSelected ? new Set() : new Set(filtered.map((it) => it.id))))
  }

  const columns: Array<DataTableColumn<PersonnelRoutingRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />, defaultWidth: 44,
          render: (it: PersonnelRoutingRow) => <input type="checkbox" checked={selected.has(it.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(it.id)} />,
        } as DataTableColumn<PersonnelRoutingRow>]
      : []),
    { key: "testCode", header: "Mã", render: (it) => it.testCode ?? "—" },
    { key: "testName", header: "Bài thử", render: (it) => <span style={{ fontWeight: 600 }}>{it.testName}</span> },
    { key: "group1", header: "Nhóm 1", render: (it) => it.group1 ?? "—" },
    { key: "group2", header: "Nhóm 2", render: (it) => it.group2 ?? "—" },
    { key: "phong", header: "Phòng", render: (it) => it.phong ?? "—" },
    { key: "vts", header: "VTS", render: (it) => it.vts ?? "—" },
    { key: "standard", header: "Tiêu chuẩn", render: (it) => it.standard ?? "—" },
    { key: "prepHours", header: "Giờ chuẩn bị", render: (it) => it.prepHours ?? "—" },
    { key: "prepTELHours", header: "CB (T/E/L)", render: (it) => `${it.prepTechHours ?? "—"} / ${it.prepEngHours ?? "—"} / ${it.prepLeadHours ?? "—"}` },
    { key: "setupHours", header: "Giờ lắp đặt", render: (it) => it.setupHours ?? "—" },
    { key: "setupTELHours", header: "Lắđặt (T/E/L)", render: (it) => `${it.setupTechHours ?? "—"} / ${it.setupEngHours ?? "—"} / ${it.setupLeadHours ?? "—"}` },
    { key: "testHours", header: "Giờ thử", render: (it) => it.testHours ?? "—" },
    { key: "testTELHours", header: "Thử (T/E/L)", render: (it) => `${it.testTechHours ?? "—"} / ${it.testEngHours ?? "—"} / ${it.testLeadHours ?? "—"}` },
    { key: "reportHours", header: "Giờ báo cáo", render: (it) => it.reportHours ?? "—" },
    { key: "reportTELHours", header: "BC (T/E/L)", render: (it) => `${it.reportTechHours ?? "—"} / ${it.reportEngHours ?? "—"} / ${it.reportLeadHours ?? "—"}` },
    { key: "totalHours", header: "Tổng giờ", align: "right", render: (it) => computeRoutingCost(it, config).totalHours || "—" },
    { key: "laborCost", header: "CP nhân sự", align: "right", render: (it) => fmtVND(computeRoutingCost(it, config).withOverhead) },
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
    <PageShell title="Đơn giá nhân sự" subtitle={openGroup ? undefined : "Chọn một trung tâm để xem định tuyến giờ công"}>
      {!openGroup && (
        <>
          <div className="kpis-tier" style={{ marginBottom: 16 }}>
            <KpiCard label="Tổng bài thử" value={overview.total} tone="blue" trend={personnelTrends.total} />
            <KpiCard label="Chưa khai báo giờ" value={overview.missingHours} tone="danger" trend={personnelTrends.noHours} />
            <KpiCard label="Giờ TB / bài thử" value={overview.avgHours.toFixed(1)} tone="warning" />
            <KpiCard label="Tổng CP nhân sự" value={fmtVND(overview.totalCost)} tone="success" />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); saveRates(new FormData(e.currentTarget)) }}
            style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16, padding: 12, border: "1px solid #e7eaee", borderRadius: 10, flexWrap: "wrap" }}
          >
            <label style={{ fontSize: 12, fontWeight: 600 }}>Kỹ thuật viên
              <input type="number" name="techRate" defaultValue={config.techRate} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Kỹ sư
              <input type="number" name="engRate" defaultValue={config.engRate} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Trưởng nhóm
              <input type="number" name="leadRate" defaultValue={config.leadRate} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Quản lý
              <input type="number" name="mgrRate" defaultValue={config.mgrRate} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Phụ phí chung (%)
              <input type="number" name="overheadPct" defaultValue={config.overheadPct} style={{ width: 100, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4, display: "block" }} />
            </label>
            <Perm minPerm="dept_head"><button type="submit" className="btn-pri" disabled={pending} style={{ minHeight: 48, boxSizing: "border-box" }}>Lưu đơn giá</button></Perm>
          </form>
          {groups.length === 0 ? (
            <div className="empty">Chưa có trung tâm nào — thêm trung tâm ở trang Trung tâm để tạo định tuyến theo từng trung tâm.</div>
          ) : (
            <div className="cu-grid">
              {groups.map((g) => {
                const totalCost = g.items.reduce((a, it) => a + computeRoutingCost(it, config).withOverhead, 0)
                const totalHours = g.items.reduce((a, it) => a + computeRoutingCost(it, config).totalHours, 0)
                const initial = g.name.replace(/Trung tâm|thử nghiệm/gi, "").trim().slice(0, 2).toUpperCase() || "TT"
                return (
                  <div key={g.key} className="hub-card" onClick={() => openCenter(g.key)} style={{ cursor: "pointer" }}>
                    <div className="hub-top">
                      <div className="hub-icon">{initial}</div>
                      <div className="hub-title"><h4>{g.name}</h4><p>{g.items.length} bài thử · {fmtVND(totalCost)}</p></div>
                      <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                    </div>
                    <div className="hub-stats">
                      <div className="hub-stat"><b>{g.items.length}</b><span>Bài thử</span></div>
                      <div className="hub-stat"><b>{totalHours.toFixed(1)}</b><span>Tổng giờ</span></div>
                      <div className="hub-stat"><b>{fmtVND(totalCost)}</b><span>CP nhân sự</span></div>
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
            <KpiCard label="Chưa khai báo giờ" value={groupOverview.missingHours} tone="danger" />
            <KpiCard label="Giờ TB / bài thử" value={groupOverview.avgHours.toFixed(1)} tone="warning" />
            <KpiCard label="Tổng CP nhân sự" value={fmtVND(groupOverview.totalCost)} tone="success" />
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
                  <button type="button" className="btn-pri" onClick={openNew}>+ Thêm định tuyến</button>
                </Perm>
              </span>
            </div>
          </div>
          <DataTable columns={columns} rows={filtered} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có định tuyến nào" onRowClick={(it) => openEdit(it)} resizable maxBodyHeight={560} fillHeight />
        </>
      )}

      <FormModal
        open={showForm}
        title={editing ? "Sửa định tuyến" : "Thêm định tuyến"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-personnel-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-personnel-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mã
              <input name="testCode" defaultValue={editing?.testCode ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 2 }}>Bài thử *
              <input name="testName" required defaultValue={editing?.testName ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Trung tâm
            <CustomSelect value={fCenterId} onChange={setFCenterId} width="100%" options={[{ value: "", label: NO_CENTER_LABEL }, ...centers.map((c) => ({ value: c.id, label: c.name }))]} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Nhóm 1
              <input name="group1" defaultValue={editing?.group1 ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Nhóm 2
              <input name="group2" defaultValue={editing?.group2 ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Phòng
              <input name="phong" defaultValue={editing?.phong ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>VTS
              <input name="vts" defaultValue={editing?.vts ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 2 }}>Tiêu chuẩn
              <input name="standard" defaultValue={editing?.standard ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giờ chuẩn bị
              <input name="prepHours" defaultValue={editing?.prepHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giờ lắp đặt
              <input name="setupHours" defaultValue={editing?.setupHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>CB-Tech
              <input name="prepTechHours" defaultValue={editing?.prepTechHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>CB-Eng
              <input name="prepEngHours" defaultValue={editing?.prepEngHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>CB-Lead
              <input name="prepLeadHours" defaultValue={editing?.prepLeadHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>Lắđặt-Tech
              <input name="setupTechHours" defaultValue={editing?.setupTechHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>Lắđặt-Eng
              <input name="setupEngHours" defaultValue={editing?.setupEngHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>Lắđặt-Lead
              <input name="setupLeadHours" defaultValue={editing?.setupLeadHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giờ thử
              <input name="testHours" defaultValue={editing?.testHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giờ báo cáo
              <input name="reportHours" defaultValue={editing?.reportHours ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>Thử-Tech
              <input name="testTechHours" defaultValue={editing?.testTechHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>Thử-Eng
              <input name="testEngHours" defaultValue={editing?.testEngHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>Thử-Lead
              <input name="testLeadHours" defaultValue={editing?.testLeadHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>BC-Tech
              <input name="reportTechHours" defaultValue={editing?.reportTechHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>BC-Eng
              <input name="reportEngHours" defaultValue={editing?.reportEngHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>BC-Lead
              <input name="reportLeadHours" defaultValue={editing?.reportLeadHours ?? ""} style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá định tuyến?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} định tuyến đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default PersonnelView
