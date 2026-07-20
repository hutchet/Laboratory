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
    <PageShell title="Quản lý chất lượng (ISO 17025)" subtitle="Checklist từ dữ liệu thật, lịch hiệu chuẩn, nhật ký truy vết">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Quá hạn hiệu chuẩn" value={overdue.length} tone={overdue.length ? "danger" : "neutral"} />
        <KpiCard label="Sắp đến hạn (≤30 ngày)" value={soon.length} tone={soon.length ? "warning" : "neutral"} />
        <KpiCard label="Còn hiệu lực" value={ok.length} tone="success" />
        <KpiCard label="Tổng nhật ký truy vết" value={auditLogCount} tone="neutral" />
      </div>

      <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>Checklist tuân thủ (theo mục ISO/IEC 17025)</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
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

      <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>Lịch hiệu chuẩn thiết bị</h3>
      <div style={{ marginBottom: 28 }}>
        <DataTable columns={calColumns} rows={calibration} rowKey={(r) => r.id} emptyTitle="Chưa có thiết bị nào có dữ liệu hiệu chuẩn" />
      </div>

      <h3 style={{ fontSize: 14, margin: "0 0 10px" }}>Nhật ký truy vết (audit trail)</h3>
      <div style={{ marginBottom: 10 }}>
        <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm theo nội dung/người thực hiện..." }}>
          <CustomSelect
            value={entityFilter}
            onChange={setEntityFilter}
            options={QL_ENTITY_OPTIONS}
            width={200}
          />
        </FilterBar>
      </div>
      <DataTable columns={auditColumns} rows={filteredAudit} rowKey={(a) => a.id} emptyTitle="Chưa có nhật ký nào khớp điều kiện lọc" resizable />
    </PageShell>
  )
}

export default QualityView
