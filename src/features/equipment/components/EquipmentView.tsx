"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { computeSimpleTrend } from "@/shared/lib/trend"
import { StatusBadge } from "@/shared/ui/status-badge"
import { CustomSelect } from "@/shared/ui/custom-select"
import { Perm } from "@/shared/lib/rbac-client"
import { saveEquipment, deleteEquipment, bulkDeleteEquipment } from "../actions"
import { saveCenter } from "@/features/centers/actions"
import { EQUIPMENT_STATUS_LABEL, CAL_STATUS_LABEL, equipmentCalStatus, type EquipmentRow, type BookingRow, type Option } from "../types"

function statusTone(status: string | null): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "active") return "success"
  if (status === "maintenance") return "warning"
  if (status === "broken") return "danger"
  return "neutral"
}

function calTone(state: "overdue" | "soon" | "ok"): "neutral" | "warning" | "danger" {
  if (state === "overdue") return "danger"
  if (state === "soon") return "warning"
  return "neutral"
}

// y/c 111 (khao sat kien truc: "Lam lai dung ban goc"): port lai dung mo hinh 2 cap
// cua renderEqMgmt() ban goc (dong 6694-6702) - luoi the hub-card theo Trung tam thu
// nghiem (bam vao 1 the -> xem KPI + bang thiet bi rieng cua Trung tam do), thay cho
// 1 bang phang duy nhat co cot "Trung tam" (mo hinh tam da dung o cac ban truoc). Nhom
// "khong gan Trung tam nao" dung nhan y het ban goc (groups[e.center||'Trung tâm thử
// nghiệm chung']).
const NO_CENTER_KEY = "__none__"
const NO_CENTER_LABEL = "Trung tâm thử nghiệm chung"

type CenterGroup = { key: string; name: string; centerId: string | null; items: EquipmentRow[] }

export function EquipmentView({ equipment, centers, bookings = [] }: { equipment: EquipmentRow[]; centers: Option[]; bookings?: BookingRow[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<EquipmentRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formCenterId, setFormCenterId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  // Port cua eqCenterEditMode ban goc (dong ~6716, ~7700): edit mode chi ap dung
  // trong pham vi 1 Trung tam dang mo, KHONG con la 1 nut o dau trang toan cuc.
  const [centerEditMode, setCenterEditMode] = useState(false)
  // Port cua eqOpenCenter ban goc (dong 4122): "" = dang xem luoi the Trung tam,
  // khac "" = dang xem chi tiet 1 Trung tam (key = centerId, hoac NO_CENTER_KEY).
  const [openCenterKey, setOpenCenterKey] = useState<string>("")
  // Port cua eqMgmtCategory ban goc (dong 4120): bo loc danh muc trong pham vi
  // Trung tam dang mo (select trong .detail-filter-bar).
  const [mgmtCategory, setMgmtCategory] = useState("all")
  const [centerNameEdit, setCenterNameEdit] = useState("")
  const [pending, startTransition] = useTransition()

  // CustomSelect dieu khien bang state, khong tu sinh input "name" nhu <select>
  // goc - dong bo lai moi khi mo form (cung mau sua nhu PlanView ban ba).
  const [eqCenterId, setEqCenterId] = useState("")
  const [eqStatus, setEqStatus] = useState("active")

  useEffect(() => {
    if (showForm) {
      setEqCenterId(editing?.centerId ?? formCenterId ?? "")
      setEqStatus(editing?.status ?? "active")
    }
  }, [showForm, editing, formCenterId])

  // Port cua eqCategories() ban goc (dong ~6522, 6701): danh sach danh muc
  // duy nhat de goi y trong datalist form them/sua thiet bi (khong bao gom "Tat ca").
  const categoryDatalistOptions = useMemo(
    () => Array.from(new Set(equipment.map((e) => e.category).filter((c): c is string => !!c))),
    [equipment]
  )

  // Port cua "groups={}" trong renderEqMgmt() (dong 6695-6696): nhom thiet bi theo
  // Trung tam, sap xep ten theo alphabet (tuong duong names.sort() ban goc).
  const groups: CenterGroup[] = useMemo(() => {
    const map = new Map<string, CenterGroup>()
    for (const e of equipment) {
      const key = e.centerId ?? NO_CENTER_KEY
      const name = e.center?.name ?? NO_CENTER_LABEL
      if (!map.has(key)) map.set(key, { key, name, centerId: e.centerId, items: [] })
      map.get(key)!.items.push(e)
    }
    // Include centers without equipment so empty centers appear in the grid
    for (const c of centers) {
      const key = c.id
      if (!map.has(key)) {
        map.set(key, { key, name: c.name, centerId: c.id, items: [] })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"))
  }, [equipment, centers])

  const openGroup = groups.find((g) => g.key === openCenterKey) ?? null

  // Port cua #page-title.title-back ban goc (dong 6458, 6699-6700): khi da mo 1
  // Trung tam, tieu de trang tren topbar (id="page-title", xem app/(app)/layout.tsx)
  // tro thanh nut "back" - bam vao la ve lai luoi the Trung tam. Dung dung mau da
  // chot voi PlanView (xem PlanView.tsx - projectFilter/title-back).
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

  function openCenter(key: string) {
    setOpenCenterKey(key)
    setCenterEditMode(false)
    setSelected(new Set())
    setMgmtCategory("all")
    setQ("")
  }
  function backToGrid() {
    setOpenCenterKey("")
    setCenterEditMode(false)
    setSelected(new Set())
    setQ("")
  }

  const centerCategoryOptions = useMemo(() => {
    if (!openGroup) return []
    return Array.from(new Set(openGroup.items.map((e) => e.category).filter((c): c is string => !!c)))
  }, [openGroup])

  // Port cua bieu thuc loc "items=allItems.filter(...)" trong renderEqMgmt() (dong
  // 6700): loc theo danh muc + tim kiem trong pham vi Trung tam dang mo (ten/ma/
  // hang/dong may/phong thu).
  const centerFilteredItems = useMemo(() => {
    if (!openGroup) return []
    return openGroup.items.filter((e) => {
      if (mgmtCategory !== "all" && e.category !== mgmtCategory) return false
      if (q) {
        const hay = `${e.name} ${e.code ?? ""} ${e.manufacturer ?? ""} ${e.model ?? ""} ${e.room ?? ""}`.toLowerCase()
        if (!hay.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [openGroup, mgmtCategory, q])

  const centerReady = openGroup ? openGroup.items.filter((e) => e.status !== "maintenance").length : 0
  const centerMaint = openGroup ? openGroup.items.length - centerReady : 0
  const centerRooms = openGroup ? new Set(openGroup.items.map((e) => e.room).filter(Boolean)).size : 0
  const centerPower = openGroup ? openGroup.items.reduce((a, e) => a + (e.power || 0), 0) : 0

  // Port cua eqOverviewAnalyticsHtml() ban goc (dong ~6688): tong quan toan bo thiet
  // bi khi CHUA mo Trung tam nao nao (vong tron ty le san sang/bao tri + top 6 thanh
  // so sanh so luong theo Trung tam).
  const overview = useMemo(() => {
    const all = equipment
    const total = all.length
    const ready = all.filter((e) => e.status !== "maintenance").length
    const maint = total - ready
    const rooms = new Set(all.map((e) => e.room).filter(Boolean)).size
    const pct = total ? Math.round((ready / total) * 100) : 0
    const max = Math.max(1, ...groups.map((g) => g.items.length))
    return { total, ready, maint, rooms, pct, max }
  }, [equipment, groups])

  // ---- KPI trends ----
  const eqTrendReady = useMemo(() => computeSimpleTrend(equipment, (e) => e.status !== "maintenance", (e) => e.createdAt), [equipment])
  const eqTrendMaint = useMemo(() => computeSimpleTrend(equipment, (e) => e.status === "maintenance", (e) => e.createdAt), [equipment])
  const eqTrendRooms = useMemo(() => {
    const all = equipment
    const now = Date.now()
    const DAY = 86400000
    const weekAgo = now - 7 * DAY
    // Rooms doesn't use item count — compute unique rooms per snapshot
    const currRooms = new Set(all.filter((e) => new Date(e.createdAt).getTime() <= now).map((e) => e.room).filter(Boolean)).size
    const prevRooms = new Set(all.filter((e) => new Date(e.createdAt).getTime() <= weekAgo).map((e) => e.room).filter(Boolean)).size
    let pct: number, up: boolean | null
    if (prevRooms === 0) { pct = 0; up = null }
    else { const raw = Math.round(((currRooms - prevRooms) / prevRooms) * 100); pct = Math.abs(raw); up = raw === 0 ? null : raw > 0 }
    const sparkline: number[] = []
    for (let i = 6; i >= 0; i--) {
      const asOf = now - i * DAY
      sparkline.push(new Set(all.filter((e) => new Date(e.createdAt).getTime() <= asOf).map((e) => e.room).filter(Boolean)).size)
    }
    return { pct, up, sparkline }
  }, [equipment])

  function openNew(centerId?: string | null) {
    setEditing(null)
    setFormCenterId(centerId ?? null)
    setShowForm(true)
  }
  function openEdit(e: EquipmentRow) {
    setEditing(e)
    setFormCenterId(null)
    setShowForm(true)
  }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      name: String(formData.get("name") || ""),
      code: String(formData.get("code") || ""),
      category: String(formData.get("category") || ""),
      manufacturer: String(formData.get("manufacturer") || ""),
      model: String(formData.get("model") || ""),
      qty: formData.get("qty") ? Number(formData.get("qty")) : null,
      room: String(formData.get("room") || ""),
      area: formData.get("area") ? Number(formData.get("area")) : null,
      power: formData.get("power") ? Number(formData.get("power")) : null,
      spec: String(formData.get("spec") || ""),
      centerId: String(formData.get("centerId") || "") || null,
      hourlyRate: formData.get("hourlyRate") ? Number(formData.get("hourlyRate")) : null,
      status: String(formData.get("status") || "active"),
      calLast: String(formData.get("calLast") || "") || null,
      calInterval: formData.get("calInterval") ? Number(formData.get("calInterval")) : null,
      calCert: String(formData.get("calCert") || "") || null,
      calVendor: String(formData.get("calVendor") || "") || null,
    }
    startTransition(async () => { await saveEquipment(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteEquipment(id); setConfirmDeleteId(null) })
  }
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleCenterEditMode() {
    setCenterEditMode((v) => { if (v) setSelected(new Set()); return !v })
  }
  function confirmBulkDelete() {
    const ids = Array.from(selected)
    startTransition(async () => { await bulkDeleteEquipment(ids); setSelected(new Set()); setBulkConfirm(false) })
  }
  // y/c bug-fix (22/07 8:36): doi ten Trung tam TRUOC DAY bi gan nham vao nut "Chinh
  // sua" trong bang thiet bi chi tiet (gay nham lan voi sua THONG TIN THIET BI). Chuyen
  // thanh 1 modal rieng, mo tu nut "Sua" ngay tren tung the Trung tam (hub-card) o luoi
  // tong quan - dung nhu yeu cau "them/chinh sua cac the danh sach thiet bi theo trung
  // tam", khong con lien quan gi den centerEditMode/bang thiet bi nua.
  const [centerRenameFor, setCenterRenameFor] = useState<CenterGroup | null>(null)
  function openCenterRename(g: CenterGroup) {
    setCenterRenameFor(g)
    setCenterNameEdit(g.name)
  }
  function saveCenterRename() {
    if (!centerRenameFor || !centerRenameFor.centerId) return
    const name = centerNameEdit.trim()
    if (!name) return
    startTransition(async () => { await saveCenter({ id: centerRenameFor.centerId!, name }); setCenterRenameFor(null) })
  }

  // y/c #105.1: an cot Sua/Xoa cho den khi bam "Chinh sua" (centerEditMode=true) -
  // dung hanh vi voi PlanView/CatalogView... da chot o cac ban truoc, KHONG theo
  // dung literal HTML goc (renderEqMgmt() dong 6694 luon hien Sua/Xoa) vi nguoi dung
  // yeu cau ro rang ghi de hanh vi goc cho module chinh sua toan he thong.
  const detailColumns: Array<DataTableColumn<EquipmentRow>> = [
    ...(centerEditMode
      ? [{
          key: "sel", header: "", defaultWidth: 40,
          render: (e: EquipmentRow) => <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} onClick={(ev) => ev.stopPropagation()} />,
        } as DataTableColumn<EquipmentRow>]
      : []),
    { key: "idx", header: "STT", defaultWidth: 48, render: (e) => centerFilteredItems.findIndex((x) => x.id === e.id) + 1 },
    { key: "code", header: "Mã", render: (e) => e.code ?? "—" },
    { key: "name", header: "Thiết bị", render: (e) => <span style={{ fontWeight: 600 }}>{e.name}</span> },
    { key: "category", header: "Phân loại", render: (e) => e.category ?? "—" },
    { key: "manufacturer", header: "Hãng SX", render: (e) => e.manufacturer ?? "—" },
    { key: "model", header: "Dòng máy", render: (e) => e.model ?? "—" },
    { key: "room", header: "Phòng", render: (e) => e.room ?? "—" },
    { key: "area", header: "Diện tích (m²)", align: "right", render: (e) => e.area ?? "—" },
    { key: "power", header: "Công suất (kW)", align: "right", render: (e) => e.power ?? "—" },
    { key: "qty", header: "SL", align: "right", render: (e) => e.qty ?? "—" },
    { key: "hourlyRate", header: "Đơn giá/giờ", align: "right", render: (e) => (e.hourlyRate != null ? e.hourlyRate.toLocaleString("vi-VN") : "—") },
    { key: "status", header: "Trạng thái", render: (e) => <StatusBadge label={EQUIPMENT_STATUS_LABEL[e.status ?? "active"] ?? e.status ?? "—"} tone={statusTone(e.status)} /> },
    {
      key: "cal",
      header: "Hiệu chuẩn",
      render: (e) => {
        const cs = equipmentCalStatus(e)
        if (!cs) return <span style={{ color: "#8a8f98" }}>—</span>
        return (
          <span title={`Hạn: ${new Date(cs.due).toLocaleDateString("vi-VN")}`}>
            <StatusBadge label={CAL_STATUS_LABEL[cs.state]} tone={calTone(cs.state)} />
          </span>
        )
      },
    },
    ...(centerEditMode
      ? [{
          key: "actions", header: "", align: "right" as const,
          render: (e: EquipmentRow) => (
            <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(ev) => ev.stopPropagation()}>
              <button type="button" className="txt-act pri" onClick={() => openEdit(e)}>Sửa</button>
              <button type="button" className="txt-act del" onClick={() => setConfirmDeleteId(e.id)}>Xoá</button>
            </span>
          ),
        } as DataTableColumn<EquipmentRow>]
      : []),
  ]

  return (
    <PageShell
      title="Thiết bị"
      filters={
        <FilterBar search={{ value: q, onChange: setQ, placeholder: openGroup ? "Tìm trong trung tâm này..." : "Tìm thiết bị..." }} />
      }
    >
      {!openGroup && (
        <>
          {/* Port cua eqOverviewAnalyticsHtml() ban goc: chi hien khi dang xem luoi the
              Trung tam (chua mo 1 Trung tam cu the), giong #eq-overview-analytics
              bi an (classList.add('hidden')) khi eqOpenCenter co gia tri (dong 6700). */}
          {groups.length > 0 && (
            <div className="card overview-analytics">
              <div className="analytics-layout">
                <div>
                  <div className="analytics-ring" style={{ background: `conic-gradient(var(--green) 0 ${overview.pct}%, var(--red) ${overview.pct}% 100%)` }}>
                    <div className="analytics-ring-center"><b>{overview.total}</b><span>Tổng thiết bị</span></div>
                  </div>
                </div>
                <div>
                  <div className="analytics-head">
                    <div><h3>Tổng quan toàn bộ thiết bị</h3><p>Phân bổ tình trạng và số lượng theo trung tâm thử nghiệm</p></div>
                  </div>
<div id="eq-analytics-metrics" className="analytics-metrics" style={{gridTemplateColumns:"repeat(4,1fr)!important"}}>
                    <div className="analytics-metric"><b>{overview.ready}</b><span>Sẵn sàng</span></div>
                    <div className="analytics-metric"><b>{overview.maint}</b><span>Bảo trì</span></div>
                    <div className="analytics-metric"><b>{groups.length}</b><span>Trung tâm</span></div>
                    <div className="analytics-metric"><b>{overview.rooms}</b><span>Phòng thử</span></div>
                  </div>
                  <div className="analytics-bars">
                    {groups.slice(0, 6).map((g) => (
                      <div key={g.key} className="analytics-bar-row">
                        <span>{g.name}</span>
                        <div className="analytics-bar"><i style={{ width: `${(g.items.length / overview.max) * 100}%` }} /></div>
                        <b>{g.items.length}</b>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {groups.length === 0 ? (
            <div className="empty">Chưa có thiết bị nào.</div>
          ) : (
            <div id="eq-center-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18, marginBottom: 20 }}>
              {groups.map((g) => {
                const ready = g.items.filter((e) => e.status !== "maintenance").length
                const maint = g.items.length - ready
                const rooms = new Set(g.items.map((e) => e.room).filter(Boolean)).size
                const power = g.items.reduce((a, e) => a + (e.power || 0), 0)
                const cats = new Set(g.items.map((e) => e.category).filter(Boolean)).size
                const initial = g.name.replace(/Trung tâm|thử nghiệm/gi, "").trim().slice(0, 2).toUpperCase() || "TT"
                return (
                  <div key={g.key} className="hub-card" onClick={() => openCenter(g.key)}>
                    <div className="hub-top">
                      <div className="hub-icon">{initial}</div>
                      <div className="hub-title"><h4>{g.name}</h4><p>{g.items.length} thiết bị · {rooms} phòng thử</p></div>
                      <span className="hub-arrow sys-arrow-glyph">›</span>
                    </div>
                    <div className="hub-tags">
                      <span className="hub-tag">{cats} danh mục</span>
                      <span className="hub-tag">{power.toLocaleString("vi-VN")} kW</span>
                    </div>
                    <div className="hub-stats">
                      <div className="hub-stat"><b>{g.items.length}</b><span>Thiết bị</span></div>
                      <div className="hub-stat"><b style={{ color: "var(--green)" }}>{ready}</b><span>Sẵn sàng</span></div>
                      <div className="hub-stat"><b style={{ color: "var(--red)" }}>{maint}</b><span>Bảo trì</span></div>
                    </div>
                    <Perm minPerm="dept_head">
                      <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                        <button type="button" className="btn-line" style={{ flex: 1 }} onClick={() => openNew(g.centerId)}>+ Thêm thiết bị</button>
                        {g.centerId && (
                          <button type="button" className="btn-line" onClick={() => openCenterRename(g)}>Sửa</button>
                        )}
                      </div>
                    </Perm>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {openGroup && (
        <div className="center-detail-section">
          <div className="grid kpis" style={{ marginBottom: 16 }}>
            <div className="kcard kb"><div className="v">{openGroup.items.length}</div><div className="l">Tổng thiết bị</div><div className="s">{openGroup.name}</div></div>
            <div className="kcard kg"><div className="v">{centerReady}</div><div className="l">Sẵn sàng</div><div className="s">Có thể sử dụng</div></div>
            <div className="kcard kr"><div className="v">{centerMaint}</div><div className="l">Bảo trì</div><div className="s">Cần theo dõi</div></div>
            <div className="kcard kp"><div className="v">{centerPower.toLocaleString("vi-VN")}</div><div className="l">Tổng công suất</div><div className="s">{centerRooms} phòng thử</div></div>
          </div>

          <div className="card center-detail-card">
            <div className="ch">
              <div><h3>{openGroup.name}</h3><span>Danh sách thiết bị chi tiết</span></div>
              <div className="center-detail-tools">
                <button type="button" className="btn-pri" onClick={() => openNew(openGroup.centerId)}>+ Thêm thiết bị</button>
                <button type="button" className={centerEditMode ? "btn-success" : "btn-line"} onClick={toggleCenterEditMode}>{centerEditMode ? "Xong" : "Chỉnh sửa"}</button>
                {centerEditMode && (
                  <button type="button" className="btn-danger" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ opacity: selected.size ? 1 : 0.5 }}>Xóa mục đã chọn</button>
                )}
              </div>
            </div>

            <div className="detail-filter-bar">
              <CustomSelect
                value={mgmtCategory}
                onChange={setMgmtCategory}
                options={[{ value: "all", label: "Tất cả danh mục" }, ...centerCategoryOptions.map((c) => ({ value: c, label: c }))]}
                triggerStyle={{ height: 48 }}
              />
              <input data-eq-detail-search value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm trong trung tâm này..." style={{ height: 48, boxSizing: "border-box" }} />
              <span
                className="detail-count"
                style={{ height: 48, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 14px", borderRadius: 9, background: "var(--card)", border: "1px solid var(--line)", color: "var(--muted)", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", boxSizing: "border-box" }}
              >
                {centerFilteredItems.length}/{openGroup.items.length} thiết bị
              </span>
            </div>

            {/* y/c bug-fix (22/07 8:36): bam truc tiep vao 1 dong de mo lai form Sua thiet
                bi day du (sua thong tin theo hang muc), khong con phai bat centerEditMode
                truoc. Checkbox/nut Sua/Xoa rieng da co stopPropagation nen khong bi mo
                form 2 lan khi bam vao chinh cac nut do. */}
            <DataTable columns={detailColumns} rows={centerFilteredItems} rowKey={(e) => e.id} onRowClick={openEdit} loading={pending} emptyTitle="Chưa có thiết bị nào" resizable maxBodyHeight={560} />
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title={editing ? "Sửa thiết bị" : "Thêm thiết bị"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-equipment-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
        width={900}
      >
        {/* y/c #105.1: thiet ke lai bo rong hinh chu nhat ngang (width=900, thay 480
            mac dinh) + nhom truong theo hang 2-3 cot de can doi hon, dung anh 1
            ("Thêm thiết bị") nguoi dung gui lam chuan doi chieu - da xac nhan
            danh sach truong khop dung id ban goc (eq-name/eq-code/eq-cat/
            eq-manufacturer/eq-model/eq-qty/eq-status/eq-center/eq-room/eq-area/
            eq-power/eq-spec/eq-cal-last/eq-cal-interval/eq-cal-cert/eq-cal-vendor). */}
        <form key={editing?.id ?? "new"} id="tf-equipment-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="centerId" value={eqCenterId} />
          <input type="hidden" name="status" value={eqStatus} />
          <div className="row">
            <div className="field" style={{ flex: 2 }}>
              <label>Tên thiết bị *</label>
              <input name="name" required defaultValue={editing?.name ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Mã</label>
              <input name="code" defaultValue={editing?.code ?? ""} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Phân loại</label>
              {/* Port cua eq-cat/eq-cat-list ban goc (dong 3712, 6701): input tu do +
                  danh sach goi y (datalist) tu cac danh muc da co, khong ep chon 1 gia tri co san. */}
              <input name="category" list="eq-cat-list" placeholder="VD: Thiết bị đo lường" defaultValue={editing?.category ?? ""} />
              <datalist id="eq-cat-list">
                {categoryDatalistOptions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Hãng sản xuất</label>
              <input name="manufacturer" defaultValue={editing?.manufacturer ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Dòng máy</label>
              <input name="model" defaultValue={editing?.model ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Số lượng</label>
              <input name="qty" type="number" min={0} defaultValue={editing?.qty ?? ""} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Trung tâm</label>
              <CustomSelect value={eqCenterId} onChange={setEqCenterId} width="100%" options={[{ value: "", label: "—" }, ...centers.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Phòng</label>
              <input name="room" defaultValue={editing?.room ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Diện tích (m²)</label>
              <input name="area" type="number" step="0.1" min={0} defaultValue={editing?.area ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Công suất (kW)</label>
              <input name="power" type="number" step="0.1" min={0} defaultValue={editing?.power ?? ""} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Đơn giá/giờ</label>
              <input name="hourlyRate" type="number" defaultValue={editing?.hourlyRate ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Trạng thái</label>
              <CustomSelect value={eqStatus} onChange={setEqStatus} width="100%" options={[{ value: "active", label: "Hoạt động" }, { value: "maintenance", label: "Bảo trì" }, { value: "broken", label: "Hỏng" }, { value: "idle", label: "Ngừng dùng" }]} />
            </div>
          </div>
          <div className="field">
            <label>Thông số kỹ thuật</label>
            <textarea name="spec" rows={2} placeholder="Ghi chú thông số kỹ thuật chi tiết..." defaultValue={editing?.spec ?? ""} style={{ resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div className="row" style={{ borderTop: "1px solid #dfe3e8", paddingTop: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Ngày hiệu chuẩn gần nhất</label>
              <input type="date" name="calLast" defaultValue={editing?.calLast ? editing.calLast.slice(0, 10) : ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Chu kỳ hiệu chuẩn (tháng)</label>
              <input type="number" name="calInterval" min={1} placeholder="VD: 12" defaultValue={editing?.calInterval ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Số chứng chỉ hiệu chuẩn</label>
              <input name="calCert" placeholder="VD: CAL-2026-0012" defaultValue={editing?.calCert ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Đơn vị hiệu chuẩn</label>
              <input name="calVendor" placeholder="VD: Quatest 3" defaultValue={editing?.calVendor ?? ""} />
            </div>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={!!centerRenameFor}
        title="Sửa tên trung tâm"
        onClose={() => setCenterRenameFor(null)}
        onSubmit={saveCenterRename}
        submitLabel="Lưu"
        submitting={pending}
      >
        <div className="field">
          <label>Tên trung tâm</label>
          <input value={centerNameEdit} onChange={(e) => setCenterNameEdit(e.target.value)} autoFocus />
        </div>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá thiết bị?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} thiết bị đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default EquipmentView
