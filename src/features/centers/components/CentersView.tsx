"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { Perm } from "@/shared/lib/rbac-client"
import { saveCenter, deleteCenter } from "../actions"
import type { CenterRow } from "../types"

function fmtValue(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ VNĐ`
  if (v >= 1e6) return `${Math.round(v / 1e6).toLocaleString("vi-VN")} triệu VNĐ`
  if (v > 0) return v.toLocaleString("vi-VN")
  return "0 đ"
}

export function CentersView({ centers }: { centers: CenterRow[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<CenterRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const kpis = useMemo(() => {
    const total = centers.length
    const totalProjects = centers.reduce((sum, c) => sum + c.projectCount, 0)
    const totalValue = centers.reduce((sum, c) => sum + c.totalValue, 0)
    const customerIds = new Set<string>()
    centers.forEach((c) => { if (c.customerCount) customerIds.add(c.id) })
    const totalCustomerLinks = centers.reduce((sum, c) => sum + c.customerCount, 0)
    return { total, totalProjects, totalValue, totalCustomerLinks }
  }, [centers])

  const filtered = useMemo(() => centers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())), [centers, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(c: CenterRow) { setEditing(c); setShowForm(true) }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      name: String(formData.get("name") || ""),
      address: String(formData.get("address") || ""),
      manager: String(formData.get("manager") || ""),
      phone: String(formData.get("phone") || ""),
      notes: String(formData.get("notes") || ""),
      elecPrice: formData.get("elecPrice") ? Number(formData.get("elecPrice")) : null,
      rentPrice: formData.get("rentPrice") ? Number(formData.get("rentPrice")) : null,
    }
    startTransition(async () => { await saveCenter(input); setShowForm(false); setEditing(null) })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => { await deleteCenter(id); setConfirmDeleteId(null) })
  }

  const columns: Array<DataTableColumn<CenterRow>> = [
    { key: "name", header: "Trung tâm", render: (c) => <span style={{ fontWeight: 600 }}>{c.name}</span> },
    { key: "manager", header: "Phụ trách", render: (c) => c.manager ?? "—" },
    { key: "phone", header: "Sđt", render: (c) => c.phone ?? "—" },
    { key: "address", header: "Địa chỉ", render: (c) => c.address ?? "—" },
    { key: "elecPrice", header: "Giá điện", align: "right", render: (c) => (c.elecPrice != null ? `${c.elecPrice.toLocaleString("vi-VN")} đ/kWh` : "—") },
    { key: "rentPrice", header: "Giá thuê nhà xưởng", align: "right", render: (c) => (c.rentPrice != null ? `${c.rentPrice.toLocaleString("vi-VN")} đ/m²/giờ` : "—") },
    { key: "projects", header: "Dự án", align: "right", render: (c) => `${c.projectCount}` },
    { key: "value", header: "Giá trị", align: "right", render: (c) => fmtValue(c.totalValue) },
    {
      key: "actions", header: "", align: "right",
      render: (c) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => openEdit(c)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteId(c.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button>
        </span>
      ),
    },
  ]

  return (
    <PageShell
      title="Trung tâm thử nghiệm"
      actions={<Perm minPerm="manager"><button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm trung tâm</button></Perm>}
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm trung tâm..." }} />}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Tổng trung tâm" value={kpis.total} />
        <KpiCard label="Tổng dự án liên kết" value={kpis.totalProjects} tone="warning" />
        <KpiCard label="Tổng giá trị dự án" value={fmtValue(kpis.totalValue)} tone="success" />
        <KpiCard label="Khách hàng liên quan" value={kpis.totalCustomerLinks} tone="danger" />
      </div>

      <DataTable columns={columns} rows={filtered} rowKey={(c) => c.id} loading={pending} emptyTitle="Chưa có trung tâm nào" />

      <FormModal
        open={showForm}
        title={editing ? "Sửa trung tâm" : "Thêm trung tâm"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-center-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
      >
        <form id="tf-center-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên *
            <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Phụ trách
              <input name="manager" defaultValue={editing?.manager ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Sđt
              <input name="phone" defaultValue={editing?.phone ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Địa chỉ
            <input name="address" defaultValue={editing?.address ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giá điện (đ/kWh)
              <input type="number" name="elecPrice" defaultValue={editing?.elecPrice ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Giá thuê nhà xưởng (đ/m²/giờ)
              <input type="number" name="rentPrice" defaultValue={editing?.rentPrice ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Ghi chú
            <textarea name="notes" defaultValue={editing?.notes ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá trung tâm?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
    </PageShell>
  )
}

export default CentersView
