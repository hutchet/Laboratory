"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { Perm } from "@/shared/lib/rbac-client"
import { saveCustomer, deleteCustomer } from "../actions"
import type { CustomerRow } from "../types"

function fmtValue(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ VNĐ`
  if (v >= 1e6) return `${Math.round(v / 1e6).toLocaleString("vi-VN")} triệu VNĐ`
  if (v > 0) return v.toLocaleString("vi-VN")
  return "0 đ"
}

export function CustomersView({ customers }: { customers: CustomerRow[] }) {
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<CustomerRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const kpis = useMemo(() => {
    const total = customers.length
    const withProj = customers.filter((c) => c.projectCount > 0).length
    const totalProjects = customers.reduce((sum, c) => sum + c.projectCount, 0)
    const totalValue = customers.reduce((sum, c) => sum + c.displayValue, 0)
    return { total, withProj, totalProjects, totalValue }
  }, [customers])

  const filtered = useMemo(
    () => customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase())),
    [customers, q]
  )

  function openNew() {
    setEditing(null)
    setShowForm(true)
  }
  function openEdit(c: CustomerRow) {
    setEditing(c)
    setShowForm(true)
  }
  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      name: String(formData.get("name") || ""),
      contact: String(formData.get("contact") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      address: String(formData.get("address") || ""),
      value: formData.get("value") ? Number(formData.get("value")) : null,
      notes: String(formData.get("notes") || ""),
    }
    startTransition(async () => {
      await saveCustomer(input)
      setShowForm(false)
      setEditing(null)
    })
  }
  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => {
      await deleteCustomer(id)
      setConfirmDeleteId(null)
    })
  }

  const columns: Array<DataTableColumn<CustomerRow>> = [
    { key: "name", header: "Tên khách hàng", render: (c) => <span style={{ fontWeight: 600 }}>{c.name}</span> },
    { key: "contact", header: "Người liên hệ", render: (c) => c.contact ?? "—" },
    { key: "email", header: "Email", render: (c) => c.email ?? "—" },
    { key: "phone", header: "Sđt", render: (c) => c.phone ?? "—" },
    { key: "value", header: "Giá trị", align: "right", render: (c) => fmtValue(c.displayValue) },
    { key: "projects", header: "Dự án", align: "right", render: (c) => `${c.projectCount}` },
    { key: "activeProjects", header: "Đang chạy", align: "right", render: (c) => `${c.activeProjectCount}` },
    {
      key: "actions",
      header: "",
      align: "right",
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
      title="Khách hàng"
      actions={<Perm minPerm="manager"><button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm khách hàng</button></Perm>}
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm khách hàng..." }} />}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(160px, 1fr))", gap: 12, marginBottom: 18 }}>
        <KpiCard label="Tổng khách hàng" value={kpis.total} />
        <KpiCard label="Đang có dự án" value={kpis.withProj} tone="warning" />
        <KpiCard label="Tổng dự án liên quan" value={kpis.totalProjects} tone="success" />
        <KpiCard label="Tổng giá trị hợp đồng" value={fmtValue(kpis.totalValue)} tone="danger" />
      </div>

      <DataTable columns={columns} rows={filtered} rowKey={(c) => c.id} loading={pending} emptyTitle="Chưa có khách hàng nào" />

      <FormModal
        open={showForm}
        title={editing ? "Sửa khách hàng" : "Thêm khách hàng"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-customer-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
      >
        <form id="tf-customer-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên *
            <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Người liên hệ
              <input name="contact" defaultValue={editing?.contact ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Sđt
              <input name="phone" defaultValue={editing?.phone ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Email
            <input name="email" type="email" defaultValue={editing?.email ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Địa chỉ
            <input name="address" defaultValue={editing?.address ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Giá trị
            <input name="value" type="number" defaultValue={editing?.value ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Ghi chú
            <textarea name="notes" defaultValue={editing?.notes ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá khách hàng?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
    </PageShell>
  )
}

export default CustomersView
