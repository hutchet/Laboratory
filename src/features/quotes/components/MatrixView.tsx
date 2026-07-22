"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { updateEquipmentRate } from "../actions"
import type { EquipmentPricingRow } from "../queries"

function fmtVND(n: number) {
  return n.toLocaleString("vi-VN")
}

export function MatrixView({ items }: { items: EquipmentPricingRow[] }) {
  const [pending, startTransition] = useTransition()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [openCenter, setOpenCenter] = useState<string | null>(null)

  function save(id: string) {
    const val = drafts[id]
    const rate = val === undefined || val === "" ? null : Number(val)
    startTransition(async () => { await updateEquipmentRate(id, rate) })
  }

  // Ported from renderQuoteMatrix(): group equipment by center into hub-cards
  // showing machine count and total hourly-rate value per center.
  const groups = useMemo(() => {
    const map = new Map<string, { centerId: string | null; centerName: string; items: EquipmentPricingRow[] }>()
    for (const it of items) {
      const key = it.centerId ?? "__none__"
      const name = it.center?.name ?? "Chưa gán trung tâm"
      const g = map.get(key) ?? { centerId: it.centerId, centerName: name, items: [] }
      g.items.push(it)
      map.set(key, g)
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length)
  }, [items])

  const activeGroup = groups.find((g) => (g.centerId ?? "__none__") === openCenter)

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

  if (openCenter && activeGroup) {
    return (
      <PageShell
        title={activeGroup.centerName}
        subtitle="Chỉnh giá và nhấn ra ngoài ô để lưu"
        actions={<button type="button" onClick={() => setOpenCenter(null)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff" }}>← Quay lại danh sách trung tâm</button>}
      >
        <DataTable columns={columns} rows={activeGroup.items} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có thiết bị nào" resizable maxBodyHeight={480} />
      </PageShell>
    )
  }

  return (
    <PageShell title="Đơn giá thiết bị theo trung tâm" subtitle="Chọn một trung tâm để xem và chỉnh đơn giá thiết bị">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {groups.map((g) => {
          const key = g.centerId ?? "__none__"
          const total = g.items.reduce((s, it) => s + (it.hourlyRate ?? 0), 0)
          const initials = g.centerName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
          return (
            <button
              key={key}
              type="button"
              onClick={() => setOpenCenter(key)}
              style={{ textAlign: "left", cursor: "pointer", border: "1px solid #e7eaee", borderRadius: 12, padding: 16, background: "#fff" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 36, height: 36, borderRadius: 10, background: "#eaf1ff", color: "#1d5fd6", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{initials || "—"}</span>
                <span style={{ fontWeight: 700 }}>{g.centerName}</span>
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontSize: 13, opacity: 0.8 }}>
                <span>Thiết bị: <b>{g.items.length}</b></span>
                <span>Tổng đơn giá/giờ: <b>{fmtVND(total)} đ</b></span>
              </div>
            </button>
          )
        })}
      </div>
    </PageShell>
  )
}

export default MatrixView
