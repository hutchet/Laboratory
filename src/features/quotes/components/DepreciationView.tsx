"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { Perm } from "@/shared/lib/rbac-client"
import { KpiCard } from "@/shared/ui/kpi-card"
import { DirectionIcon } from "@/shared/ui/icons"
import { computeSimpleTrend } from "@/shared/lib/trend"
import { useCurrency } from "@/shared/ui/currency-provider"
import { saveDepreciationAsset } from "../actions"
import type { DepreciationAssetRow } from "../types"
import type { Option } from "@/features/projects/types"

// y/c 116.1 + 116.2: "Danh sách thiết bị được nhập trong trang thiết bị sẽ tự động
// được ánh xạ sang khấu hao thiết bị" (xem saveEquipment() trong
// features/equipment/actions.ts + backfill trong listDepreciationAssets()) - vì vậy
// trang này KHÔNG còn nút "+ Thêm tài sản"/"Xoá" thủ công (1 thiết bị = đúng 1 dòng
// khấu hao). "Người dùng sẽ chỉnh sửa các trường thông tin còn lại" = chỉ còn sửa
// Nhóm tài sản / Tổng giá trị / Số năm KH, Tài sản + Trung tâm hiển thị read-only
// theo đúng tên thiết bị đã tạo. Đồng thời thiết kế lại theo đúng mô hình hub-card
// của trang Thiết bị (EquipmentView.tsx): lưới thẻ theo Trung tâm + KPI + bảng chi
// tiết khi mở 1 Trung tâm - port cùng khuôn mẫu NO_CENTER_KEY/groups/openGroup.
function khPerHour(totalValue: number | null, years: number | null): number {
  const v = totalValue ?? 0
  const y = years && years > 0 ? years : 1
  return Math.round(v / (y * 8640))
}

const NO_CENTER_KEY = "__none__"
const NO_CENTER_LABEL = "Trung tâm thử nghiệm chung"

type CenterGroup = { key: string; name: string; centerId: string | null; items: DepreciationAssetRow[] }

export function DepreciationView({ items, centers = [] }: { items: DepreciationAssetRow[]; centers?: Option[] }) {
  const { currency, format: fmtVND } = useCurrency()
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<DepreciationAssetRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [openCenterKey, setOpenCenterKey] = useState<string>("")
  const [pending, startTransition] = useTransition()
  const [dvGroup, setDvGroup] = useState("")
  const [dvValue, setDvValue] = useState<string>("")
  const [dvYears, setDvYears] = useState<string>("")

  useEffect(() => {
    if (showForm && editing) {
      setDvGroup(editing.assetGroup ?? "")
      setDvValue(String(editing.totalValue ?? ""))
      setDvYears(String(editing.years ?? ""))
    }
  }, [showForm, editing])

  // Port cua "groups" trong EquipmentView.tsx (dung khuon mau hub-card theo Trung
  // tam) - nhom tai san khau hao theo Trung tam cua thiet bi lien ket.
  const groups: CenterGroup[] = useMemo(() => {
    const map = new Map<string, CenterGroup>()
    for (const it of items) {
      const key = it.centerId ?? NO_CENTER_KEY
      const name = it.center?.name ?? NO_CENTER_LABEL
      if (!map.has(key)) map.set(key, { key, name, centerId: it.centerId, items: [] })
      map.get(key)!.items.push(it)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"))
  }, [items])

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

  const centerFilteredItems = useMemo(() => {
    if (!openGroup) return []
    return openGroup.items.filter((it) => !q || it.assetName.toLowerCase().includes(q.toLowerCase()))
  }, [openGroup, q])

  // Tong quan toan bo khi CHUA mo 1 Trung tam nao - KPI toan he thong.
  const overview = useMemo(() => {
    const total = items.length
    const totalValue = items.reduce((a, it) => a + (it.totalValue || 0), 0)
    const missing = items.filter((it) => !it.totalValue || !it.years).length
    const totalPerHour = items.reduce((a, it) => a + khPerHour(it.totalValue, it.years), 0)
    return { total, totalValue, missing, totalPerHour }
  }, [items])

  const centerTotalValue = openGroup ? openGroup.items.reduce((a, it) => a + (it.totalValue || 0), 0) : 0
  const centerMissing = openGroup ? openGroup.items.filter((it) => !it.totalValue || !it.years).length : 0
  const centerPerHour = openGroup ? openGroup.items.reduce((a, it) => a + khPerHour(it.totalValue, it.years), 0) : 0
  const centerTrends = useMemo(() => {
    const list = openGroup ? openGroup.items : []
    return {
      total: computeSimpleTrend(list, () => true, (it: any) => it.createdAt ?? it.id),
      value: computeSimpleTrend(list, (it) => (it.totalValue || 0) > 0, (it: any) => it.createdAt ?? it.id),
      perHour: computeSimpleTrend(list, (it) => khPerHour(it.totalValue, it.years) > 0, (it: any) => it.createdAt ?? it.id),
      missing: computeSimpleTrend(list, (it) => !it.totalValue || !it.years, (it: any) => it.createdAt ?? it.id),
    }
  }, [openGroup])

  const dvTrendTotal = useMemo(() => computeSimpleTrend(items, () => true, (it) => (it as any).createdAt ?? it.id), [items])
  const dvTrendValue = useMemo(() => {
    const now = Date.now()
    const day = 86400000
    function valSnapshot(asOfMs: number) {
      return items.filter((it) => new Date((it as any).createdAt ?? it.id).getTime() <= asOfMs)
        .reduce((a, it) => a + (it.totalValue || 0), 0)
    }
    function pctChg(curr: number, prev: number) {
      if (prev === 0) return curr === 0 ? { pct: 0, up: null as boolean | null } : { pct: 100, up: true }
      const pct = Math.round(((curr - prev) / prev) * 100)
      if (pct === 0) return { pct: 0, up: true }
      return { pct: Math.abs(pct), up: pct >= 0 }
    }
    function sparklineFor() { const pts: number[] = []; for (let i = 6; i >= 0; i--) pts.push(valSnapshot(now - i * day)); return pts }
    const curr = valSnapshot(now); const prev = valSnapshot(now - 7 * day)
    const base = pctChg(curr, prev)
    return { pct: base.pct, up: base.up, sparkline: sparklineFor() }
  }, [items])
  const dvTrendPerHour = useMemo(() => {
    const now = Date.now(); const day = 86400000
    function snap(asOfMs: number) {
      return items.filter((it) => new Date((it as any).createdAt ?? it.id).getTime() <= asOfMs)
        .reduce((a, it) => a + khPerHour(it.totalValue, it.years), 0)
    }
    function pctChg(c: number, p: number) {
      if (p === 0) return c === 0 ? { pct: 0, up: null as boolean | null } : { pct: 100, up: true }
      const pct = Math.round(((c - p) / p) * 100)
      if (pct === 0) return { pct: 0, up: true }
      return { pct: Math.abs(pct), up: pct >= 0 }
    }
    function sp() { const pts: number[] = []; for (let i = 6; i >= 0; i--) pts.push(snap(now - i * day)); return pts }
    const c = snap(now); const p = snap(now - 7 * day); const b = pctChg(c, p)
    return { pct: b.pct, up: b.up, sparkline: sp() }
  }, [items])
  const dvTrendMissing = useMemo(() => computeSimpleTrend(items, (it) => !it.totalValue || !it.years, (it) => (it as any).createdAt ?? it.id), [items])

  function openEdit(it: DepreciationAssetRow) { setEditing(it); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    if (!editing) return
    const input = {
      id: editing.id,
      assetGroup: String(formData.get("assetGroup") || ""),
      totalValue: formData.get("totalValue") ? Number(formData.get("totalValue")) : null,
      years: formData.get("years") ? Number(formData.get("years")) : null,
    }
    startTransition(async () => { await saveDepreciationAsset(input); setShowForm(false); setEditing(null) })
  }

  const detailColumns: Array<DataTableColumn<DepreciationAssetRow>> = [
    { key: "idx", header: "STT", defaultWidth: 48, render: (it) => centerFilteredItems.findIndex((x) => x.id === it.id) + 1 },
    { key: "assetName", header: "Tài sản", render: (it) => <span style={{ fontWeight: 600 }}>{it.assetName}</span> },
    { key: "assetGroup", header: "Nhóm", render: (it) => it.assetGroup ?? "—" },
    { key: "totalValue", header: `Tổng giá trị (${currency})`, align: "right", render: (it) => (it.totalValue != null ? fmtVND(it.totalValue) : "—") },
    { key: "years", header: "Số năm KH", align: "right", render: (it) => it.years ?? "—" },
    { key: "khPerHour", header: `Khấu hao/giờ (${currency})`, align: "right", render: (it) => <b>{fmtVND(khPerHour(it.totalValue, it.years))}</b> },
    { key: "equipmentCode", header: "Mã TS SAP", render: (it) => it.equipmentCode ?? "—" },
    { key: "serialNumber", header: "S/N", render: (it) => it.serialNumber ?? "—" },
    { key: "depreciationMethod", header: "Cách tính KH", render: (it) => it.depreciationMethod ?? "—" },
    { key: "monthlyDepreciationSap", header: "KH/tháng (SAP)", align: "right", render: (it) => (it.monthlyDepreciationSap != null ? it.monthlyDepreciationSap.toLocaleString("vi-VN") : "—") },
    { key: "costCenterCode", header: "CC", render: (it) => it.costCenterCode ?? "—" },
    { key: "gapCheck", header: "GAP", align: "right", render: (it) => it.gapCheck ?? "—" },
    { key: "financeCheckStatus", header: "Ktra tài chính", render: (it) => it.financeCheckStatus ?? "—" },
    {
      key: "actions", header: "", align: "right",
      render: (it) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(ev) => ev.stopPropagation()}>
          <Perm minPerm="dept_head"><button type="button" className="txt-act pri" onClick={() => openEdit(it)}>Sửa</button></Perm>
        </span>
      ),
    },
  ]

  return (
    <PageShell title="Khấu hao thiết bị">
      {!openGroup && (
        <>
          <div className="kpis-tier" style={{ marginBottom: 16 }}>
            <KpiCard label="Tổng tài sản" value={overview.total} hint="Theo danh sách thiết bị" tone="blue" trend={dvTrendTotal} />
            <KpiCard label={`Tổng giá trị (${currency})`} value={fmtVND(overview.totalValue)} hint="Toàn bộ tài sản" tone="success" trend={dvTrendValue} />
            <KpiCard label="Tổng khấu hao/giờ" value={fmtVND(overview.totalPerHour)} hint={`${currency}/giờ`} tone="warning" trend={dvTrendPerHour} />
            <KpiCard label="Thiếu dữ liệu" value={overview.missing} hint="Chưa nhập giá trị/số năm" tone="danger" trend={dvTrendMissing} />
          </div>

          {groups.length === 0 ? (
            <div className="empty">Chưa có thiết bị nào — thêm thiết bị ở trang Thiết bị để tự động xuất hiện tại đây.</div>
          ) : (
            <div id="eq-center-cards" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18, marginBottom: 20 }}>
              {groups.map((g) => {
                const val = g.items.reduce((a, it) => a + (it.totalValue || 0), 0)
                const perHour = g.items.reduce((a, it) => a + khPerHour(it.totalValue, it.years), 0)
                const missing = g.items.filter((it) => !it.totalValue || !it.years).length
                const initial = g.name.replace(/Trung tâm|thử nghiệm/gi, "").trim().slice(0, 2).toUpperCase() || "TT"
                return (
                  <div key={g.key} className="hub-card" onClick={() => openCenter(g.key)}>
                    <div className="hub-top">
                      <div className="hub-icon">{initial}</div>
                      <div className="hub-title"><h4>{g.name}</h4><p>{g.items.length} tài sản · {fmtVND(val)}</p></div>
                      <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                    </div>
                    <div className="hub-tags">
                      <span className="hub-tag">{fmtVND(perHour)}/giờ</span>
                      {missing > 0 && <span className="hub-tag" style={{ color: "var(--red)" }}>{missing} thiếu dữ liệu</span>}
                    </div>
                    <div className="hub-stats">
                      <div className="hub-stat"><b>{g.items.length}</b><span>Tài sản</span></div>
                      <div className="hub-stat"><b style={{ color: "var(--green)" }}>{g.items.length - missing}</b><span>Đầy đủ</span></div>
                      <div className="hub-stat"><b style={{ color: "var(--red)" }}>{missing}</b><span>Thiếu</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {openGroup && (
        <div className="center-detail-section">
          <div className="kpis-tier" style={{ marginBottom: 16 }}>
            <KpiCard label="Tổng tài sản" value={openGroup.items.length} hint={openGroup.name} tone="blue" trend={centerTrends.total} />
            <KpiCard label={`Tổng giá trị (${currency})`} value={fmtVND(centerTotalValue)} hint="Trong trung tâm này" tone="success" trend={centerTrends.value} />
            <KpiCard label="Khấu hao/giờ" value={fmtVND(centerPerHour)} hint={`${currency}/giờ`} tone="warning" trend={centerTrends.perHour} />
            <KpiCard label="Thiếu dữ liệu" value={centerMissing} hint="Cần bổ sung" tone="danger" trend={centerTrends.missing} />
          </div>

          <div className="card center-detail-card">
            <div className="ch">
              <div><h3>{openGroup.name}</h3><span>Danh sách khấu hao chi tiết — ánh xạ tự động từ thiết bị</span></div>
              <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm trong trung tâm này..." }} />
            </div>
            <DataTable columns={detailColumns} rows={centerFilteredItems} rowKey={(it) => it.id} onRowClick={openEdit} loading={pending} emptyTitle="Chưa có tài sản nào" resizable maxBodyHeight={560} fillHeight />
          </div>
        </div>
      )}

      <FormModal
        open={showForm}
        title="Sửa thông tin khấu hao"
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => { const f = document.getElementById("tf-depreciation-form") as HTMLFormElement | null; if (f) handleSubmit(new FormData(f)) }}
        submitting={pending}
        width={640}
      >
        <form key={editing?.id ?? "none"} id="tf-depreciation-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* y/c 116.1: Tai san (ten) + Trung tam la READ-ONLY, lay dung theo thiet bi da
              tao trong trang Thiet bi - khong the sua truc tiep tai day. */}
          <div className="field">
            <label>Tài sản (theo tên thiết bị)</label>
            <input value={editing?.assetName ?? ""} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
          </div>
          <div className="field">
            <label>Trung tâm</label>
            <input value={editing?.center?.name ?? NO_CENTER_LABEL} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
          </div>
          {/* y/c: cac truong nay lay tu Equipment lien ket (chi hien thi tai day, sua o
              trang Thiet bi) - S/N, cach tinh khau hao, khau hao/thang SAP, CC, GAP,
              trang thai kiem tra tai chinh, ghi chu. */}
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Mã TS SAP</label>
              <input value={editing?.equipmentCode ?? ""} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>S/N</label>
              <input value={editing?.serialNumber ?? ""} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Cách tính khấu hao</label>
              <input value={editing?.depreciationMethod ?? ""} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Khấu hao/tháng (SAP)</label>
              <input value={editing?.monthlyDepreciationSap != null ? editing.monthlyDepreciationSap.toLocaleString("vi-VN") : ""} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>CC</label>
              <input value={editing?.costCenterCode ?? ""} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>GAP</label>
              <input value={editing?.gapCheck ?? ""} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Ktra tài chính</label>
              <input value={editing?.financeCheckStatus ?? ""} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
            </div>
          </div>
          {editing?.notes && (
            <div className="field">
              <label>Ghi chú</label>
              <input value={editing.notes} disabled style={{ background: "var(--bg-2, #f5f6f8)", color: "var(--muted)" }} />
            </div>
          )}
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Nhóm tài sản</label>
              <input name="assetGroup" value={dvGroup} onChange={(e) => setDvGroup(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>{`Tổng giá trị gốc (VNĐ)`}</label>
              <input type="number" name="totalValue" value={dvValue} onChange={(e) => setDvValue(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Số năm khấu hao</label>
              <input type="number" name="years" value={dvYears} onChange={(e) => setDvYears(e.target.value)} />
            </div>
          </div>
          <div className="callout" style={{ fontSize: 12, marginTop: 4 }}>
            Khấu hao/giờ tự tính = Tổng giá trị ÷ (Số năm × 8640 giờ):{" "}
            <b style={{ color: "var(--pri)" }}>{fmtVND(khPerHour(Number(dvValue) || 0, Number(dvYears) || 0))}</b>/giờ
          </div>
        </form>
      </FormModal>
    </PageShell>
  )
}

export default DepreciationView
