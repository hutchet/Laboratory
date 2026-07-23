"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { KpiCard } from "@/shared/ui/kpi-card"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { DirectionIcon } from "@/shared/ui/icons"
import { computeSimpleTrend } from "@/shared/lib/trend"
import { updateEquipmentRate } from "../actions"
import type { EquipmentPricingRow } from "../queries"
import type { Option } from "../types"
import { useCurrency } from "@/shared/ui/currency-provider"

const NO_CENTER_KEY = "__none__"
const NO_CENTER_LABEL = "Chưa gán trung tâm"

type CenterGroup = { key: string; name: string; centerId: string | null; items: EquipmentPricingRow[] }

// y/c 4.2: Ma trận báo giá luôn hiển thị đủ thẻ cho MỌI trung tâm khai báo ở
// trang Trung tâm (kể cả trung tâm chưa có thiết bị nào), không chỉ những
// trung tâm đang có dữ liệu thiết bị. Trang danh sách thẻ có 4 KPI.
export function MatrixView({ items, centers = [] }: { items: EquipmentPricingRow[]; centers?: Option[] }) {
  const { format: fmtVND } = useCurrency()
  const [pending, startTransition] = useTransition()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [openCenterKey, setOpenCenterKey] = useState("")

  function save(id: string) {
    const val = drafts[id]
    const rate = val === undefined || val === "" ? null : Number(val)
    startTransition(async () => { await updateEquipmentRate(id, rate) })
  }

  const groups: CenterGroup[] = useMemo(() => {
    const byCenter = new Map<string, EquipmentPricingRow[]>()
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

  function openCenter(key: string) { setOpenCenterKey(key) }
  function backToGrid() { setOpenCenterKey("") }

  const overview = useMemo(() => {
    const withRate = items.filter((it) => it.hourlyRate != null)
    const totalRate = items.reduce((a, it) => a + (it.hourlyRate || 0), 0)
    const avgRate = withRate.length ? totalRate / withRate.length : 0
    return { total: items.length, missingRate: items.length - withRate.length, totalRate, avgRate }
  }, [items, centers])

  const groupOverview = useMemo(() => {
    const groupItems = openGroup ? openGroup.items : []
    const withRate = groupItems.filter((it) => it.hourlyRate != null)
    const totalRate = groupItems.reduce((a, it) => a + (it.hourlyRate || 0), 0)
    const avgRate = withRate.length ? totalRate / withRate.length : 0
    return { total: groupItems.length, missingRate: groupItems.length - withRate.length, totalRate, avgRate }
  }, [openGroup])

  // Trend theo data thuc (rule KPI global) — dua tren Equipment.createdAt.
  const matrixTrends = useMemo(() => ({
    total: computeSimpleTrend(items, () => true, (it) => it.createdAt),
    withRate: computeSimpleTrend(items, (it) => it.hourlyRate != null, (it) => it.createdAt),
    noRate: computeSimpleTrend(items, (it) => it.hourlyRate == null, (it) => it.createdAt),
  }), [items])

  const columns: Array<DataTableColumn<EquipmentPricingRow>> = [
    { key: "code", header: "Mã", render: (it) => it.code ?? "—" },
    { key: "name", header: "Thiết bị", render: (it) => <span style={{ fontWeight: 600 }}>{it.name}</span> },
    {
      key: "rate", header: "Đơn giá/giờ", align: "right",
      render: (it) => (
        <input
          type="number"
          defaultValue={it.hourlyRate ?? ""}
          onChange={(e) => setDrafts((d) => ({ ...d, [it.id]: e.target.value }))}
          onBlur={() => save(it.id)}
          style={{ width: 120, padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", textAlign: "right" }}
        />
      ),
    },
  ]

  return (
    <PageShell title="Đơn giá thiết bị theo trung tâm" subtitle={openGroup ? "Chỉnh giá và nhấn ra ngoài ô để lưu" : "Chọn một trung tâm để xem và chỉnh đơn giá thiết bị"}>
      {!openGroup && (
        <>
          <div className="kpis-tier" style={{ marginBottom: 16 }}>
            <KpiCard label="Tổng thiết bị" value={overview.total} tone="blue" trend={matrixTrends.total} />
            <KpiCard label="Chưa có đơn giá" value={overview.missingRate} tone="danger" trend={matrixTrends.noRate} />
            <KpiCard label="Tổng đơn giá/giờ" value={fmtVND(overview.totalRate)} tone="warning" trend={matrixTrends.withRate} />
            <KpiCard label="Đơn giá TB/giờ" value={fmtVND(overview.avgRate)} tone="success" />
          </div>
          {groups.length === 0 ? (
            <div className="empty">Chưa có trung tâm nào — thêm trung tâm ở trang Trung tâm để tạo ma trận theo từng trung tâm.</div>
          ) : (
            <div className="cu-grid">
              {groups.map((g) => {
                const total = g.items.reduce((s, it) => s + (it.hourlyRate ?? 0), 0)
                const withRate = g.items.filter((it) => it.hourlyRate != null)
                const avgRate = withRate.length ? total / withRate.length : 0
                const initial = g.name.replace(/Trung tâm|thử nghiệm/gi, "").trim().slice(0, 2).toUpperCase() || "TT"
                return (
                  <div key={g.key} className="hub-card" onClick={() => openCenter(g.key)} style={{ cursor: "pointer" }}>
                    <div className="hub-top">
                      <div className="hub-icon">{initial}</div>
                      <div className="hub-title"><h4>{g.name}</h4><p>{g.items.length} thiết bị · {fmtVND(total)}</p></div>
                      <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                    </div>
                    <div className="hub-stats">
                      <div className="hub-stat"><b>{g.items.length}</b><span>Thiết bị</span></div>
                      <div className="hub-stat"><b>{withRate.length}</b><span>Có đơn giá</span></div>
                      <div className="hub-stat"><b>{fmtVND(avgRate)}</b><span>Đơn giá TB</span></div>
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
            <KpiCard label="Thiết bị trong trung tâm" value={groupOverview.total} tone="blue" />
            <KpiCard label="Chưa có đơn giá" value={groupOverview.missingRate} tone="danger" />
            <KpiCard label="Tổng đơn giá/giờ" value={fmtVND(groupOverview.totalRate)} tone="warning" />
            <KpiCard label="Đơn giá TB/giờ" value={fmtVND(groupOverview.avgRate)} tone="success" />
          </div>
          <DataTable columns={columns} rows={openGroup.items} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có thiết bị nào" resizable maxBodyHeight={480} fillHeight />
        </>
      )}
    </PageShell>
  )
}

export default MatrixView
