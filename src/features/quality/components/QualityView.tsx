"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { KpiCard } from "@/shared/ui/kpi-card"
import { CustomSelect } from '@/shared/ui/custom-select'
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { StatusBadge } from "@/shared/ui/status-badge"
import { toggleChecklistKey } from "../actions"
import { QL_CHECKLIST_GROUPS, QL_AUTO_KEYS, QL_ENTITY_OPTIONS } from "../types"
import type { CalibrationRow, AuditTrailRow } from "../types"

export function QualityView({
  calibration,
  checklistState,
  autoState,
  auditTrail,
  auditLogCount,
}: {
  calibration: CalibrationRow[]
  checklistState: Record<string, boolean>
  autoState: Record<string, boolean>
  auditTrail: AuditTrailRow[]
  auditLogCount: number
}) {
  const [, startTransition] = useTransition()
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const [entityFilter, setEntityFilter] = useState("all")
  const [q, setQ] = useState("")

  const overdue = calibration.filter((c) => c.state === "overdue")
  const soon = calibration.filter((c) => c.state === "soon")
  const ok = calibration.filter((c) => c.state === "ok")

  function isChecked(key: string): boolean {
    if ((QL_AUTO_KEYS as readonly string[]).includes(key)) return !!autoState[key]
    return !!checklistState[key]
  }

  function handleToggle(key: string, checked: boolean) {
    setPendingKeys((prev) => new Set(prev).add(key))
    startTransition(async () => {
      try {
        await toggleChecklistKey(key, checked)
      } finally {
        setPendingKeys((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    })
  }

  const calColumns: Array<DataTableColumn<CalibrationRow>> = [
    { key: "name", header: "Thiết bị", render: (r) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: "code", header: "Mã", render: (r) => r.code ?? "—" },
    { key: "calLast", header: "Hiệu chuẩn lần cuối", render: (r) => new Date(r.calLast).toLocaleDateString("vi-VN") },
    { key: "calInterval", header: "Chu kỳ (tháng)", render: (r) => r.calInterval },
    { key: "due", header: "Hạn hiệu chuẩn", render: (r) => new Date(r.due).toLocaleDateString("vi-VN") },
    {
      key: "state", header: "Trạng thái",
      render: (r) => {
        const label = r.state === "overdue" ? `Quá hạn ${Math.abs(r.daysLeft)} ngày` : r.state === "soon" ? `Còn ${r.daysLeft} ngày` : `Còn ${r.daysLeft} ngày`
        const tone = r.state === "overdue" ? "danger" : r.state === "soon" ? "warning" : "success"
        return <StatusBadge label={label} tone={tone} />
      },
    },
  ]

  const filteredAudit = useMemo(() => {
    let list = auditTrail
    if (entityFilter !== "all") list = list.filter((a) => a.entity === entityFilter)
    if (q) {
      const needle = q.toLowerCase()
      list = list.filter((a) => `${a.detail ?? ""} ${a.target ?? ""} ${a.userName ?? ""}`.toLowerCase().includes(needle))
    }
    return list
  }, [auditTrail, entityFilter, q])

  const auditColumns: Array<DataTableColumn<AuditTrailRow>> = [
    { key: "createdAt", header: "Thời gian", defaultWidth: 160, render: (a) => <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(a.createdAt).toLocaleString("vi-VN")}</span> },
    { key: "userName", header: "Người thực hiện", defaultWidth: 150, render: (a) => a.userName ?? "—" },
    { key: "role", header: "Vai trò", defaultWidth: 120, render: (a) => <span style={{ background: "#eef0f2", borderRadius: 6, padding: "1px 8px", fontSize: 12 }}>{a.role ?? "—"}</span> },
    { key: "entity", header: "Đối tượng", defaultWidth: 120, render: (a) => a.entity ?? "—" },
    { key: "action", header: "Hành động", defaultWidth: 100, render: (a) => a.action ?? "—" },
    { key: "detail", header: "Chi tiết", defaultWidth: 260, render: (a) => a.detail ?? "—" },
  ]

  return (
    <PageShell title="Hệ thống quản lý chất lượng" subtitle="Checklist theo ISO/IEC 17025:2017, lịch hiệu chuẩn, nhật ký truy vết — tất cả từ dữ liệu thật">
      <div className="grid kpis" style={{ marginBottom: 18 }}>
        <KpiCard label="Quá hạn hiệu chuẩn" value={overdue.length} hint="Cần xử lý ngay" tone={overdue.length ? "danger" : "neutral"} />
        <KpiCard label="Sắp đến hạn (≤30 ngày)" value={soon.length} hint="Cần lên lịch tái hiệu chuẩn" tone={soon.length ? "warning" : "neutral"} />
        <KpiCard label="Còn hiệu lực" value={ok.length} hint="Đang tuân thủ" tone="success" />
        <KpiCard label="Tổng nhật ký truy vết" value={auditLogCount} hint="Toàn bộ lịch sử thao tác" tone="neutral" />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="ch">
          <h3>Tiêu chí kiểm soát theo ISO/IEC 17025:2017</h3>
          <span>Phòng thử nghiệm được quản lý theo các điều khoản của tiêu chuẩn — không phải tiêu chí nội bộ của phần mềm này</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {QL_CHECKLIST_GROUPS.map((g) => {
          const total = g.items.length
          const doneCount = g.items.filter((it) => isChecked(it.key)).length
          return (
            <div key={g.clause} style={{ border: "1px solid #e2e5e9", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <b>Mục {g.clause} — {g.title}</b>
                  <div style={{ fontSize: 11.5, opacity: 0.6 }}>{g.desc}</div>
                </div>
                <StatusBadge label={`${doneCount}/${total}`} tone={doneCount === total ? "success" : "warning"} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {g.items.map((it) => {
                  const auto = (QL_AUTO_KEYS as readonly string[]).includes(it.key)
                  const checked = isChecked(it.key)
                  const busy = pendingKeys.has(it.key)
                  return (
                    <label key={it.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: auto ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={auto || busy}
                        onChange={(e) => handleToggle(it.key, e.target.checked)}
                      />
                      {it.label}
                      {auto ? <span style={{ color: "#8a8f98", fontSize: 11 }}>(tự động theo dữ liệu)</span> : null}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, padding: 0, overflowX: "auto" }}>
        <div className="ch" style={{ padding: "16px 18px 0" }}>
          <h3>Lịch tái hiệu chuẩn thiết bị</h3>
          <span>Sắp xếp theo mức độ khẩn cấp</span>
        </div>
        <div style={{ padding: "12px 18px 18px" }}>
          <DataTable columns={calColumns} rows={calibration} rowKey={(r) => r.id} emptyTitle="Chưa có thiết bị nào có dữ liệu hiệu chuẩn" />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div className="ch ch-toolbar" style={{ padding: "16px 18px 0" }}>
          <div>
            <h3>Nhật ký thao tác (Audit trail)</h3>
            <span>Ghi nhận ai đã làm gì, vào lúc nào</span>
          </div>
          <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm theo nội dung/người thực hiện..." }}>
            <CustomSelect
              value={entityFilter}
              onChange={setEntityFilter}
              options={QL_ENTITY_OPTIONS}
              width={200}
            />
          </FilterBar>
        </div>
        <div style={{ padding: "12px 18px 18px" }}>
          <DataTable columns={auditColumns} rows={filteredAudit} rowKey={(a) => a.id} emptyTitle="Chưa có nhật ký nào khớp điều kiện lọc" resizable />
        </div>
      </div>
    </PageShell>
  )
}

export default QualityView
