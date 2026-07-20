"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { ChipFilterDropdown, type ChipFilterOption } from "@/shared/ui/chip-filter"
import { Perm } from "@/shared/lib/rbac-client"
import { saveEquipment, deleteEquipment, bulkDeleteEquipment } from "../actions"
import { EQUIPMENT_STATUS_LABEL, CAL_STATUS_LABEL, equipmentCalStatus, type EquipmentRow, type Option } from "../types"

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

export function EquipmentView({ equipment, centers }: { equipment: EquipmentRow[]; centers: Option[] }) {
  const [q, setQ] = useState("")
  const [category, setCategory] = useState("all")
  const [editing, setEditing] = useState<EquipmentRow | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pending, startTransition] = useTransition()

  // Ported from the original app's eqCategories()/renderEqChips() (line 6522-6528
  // of the original HTML): a chip-dropdown listing distinct equipment categories.
  const categoryOptions: ChipFilterOption[] = useMemo(() => {
    const cats = Array.from(new Set(equipment.map((e) => e.category).filter((c): c is string => !!c)))
    return [{ value: "all", label: "Tất cả" }, ...cats.map((c) => ({ value: c, label: c }))]
  }, [equipment])

  // Port cua eqCategories() ban goc (dong ~6522, 6701): danh sach danh muc
  // duy nhat de goi y trong datalist form them/sua thiet bi (khong bao gom "Tat ca").
  const categoryDatalistOptions = useMemo(
    () => Array.from(new Set(equipment.map((e) => e.category).filter((c): c is string => !!c))),
    [equipment]
  )

  const filtered = useMemo(
    () =>
      equipment.filter((e) => {
        if (category !== "all" && e.category !== category) return false
        if (q && !e.name.toLowerCase().includes(q.toLowerCase()) && !(e.code ?? "").toLowerCase().includes(q.toLowerCase())) return false
        return true
      }),
    [equipment, q, category]
  )

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(e: EquipmentRow) { setEditing(e); setShowForm(true) }
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
  function toggleEditMode() {
    setEditMode((v) => { if (v) setSelected(new Set()); return !v })
  }
  function confirmBulkDelete() {
    const ids = Array.from(selected)
    startTransition(async () => { await bulkDeleteEquipment(ids); setSelected(new Set()); setBulkConfirm(false) })
  }

  const columns: Array<DataTableColumn<EquipmentRow>> = [
    ...(editMode
      ? [{
          key: "sel", header: "", defaultWidth: 44,
          render: (e: EquipmentRow) => <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} />,
        } as DataTableColumn<EquipmentRow>]
      : []),
    { key: "name", header: "Thiết bị", render: (e) => <span style={{ fontWeight: 600 }}>{e.name}</span> },
    { key: "code", header: "Mã", render: (e) => e.code ?? "—" },
    { key: "category", header: "Phân loại", render: (e) => e.category ?? "—" },
    { key: "center", header: "Trung tâm", render: (e) => e.center?.name ?? "—" },
    { key: "room", header: "Phòng", render: (e) => e.room ?? "—" },
    { key: "hourlyRate", header: "Đơn giá/giờ", align: "right", render: (e) => (e.hourlyRate != null ? e.hourlyRate.toLocaleString("vi-VN") : "—") },
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
    { key: "status", header: "Trạng thái", render: (e) => <StatusBadge label={EQUIPMENT_STATUS_LABEL[e.status ?? "active"] ?? e.status ?? "—"} tone={statusTone(e.status)} /> },
    {
      key: "actions", header: "", align: "right",
      render: (e) => (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={() => openEdit(e)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteId(e.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button>
        </span>
      ),
    },
  ]

  return (
    <PageShell
      title="Thiết bị"
      actions={
        <span style={{ display: "flex", gap: 8 }}>
          {editMode && (
            <button type="button" disabled={!selected.size} onClick={() => setBulkConfirm(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #c62828", background: "#fff", color: "#c62828", opacity: selected.size ? 1 : 0.5 }}>Xoá mục đã chọn</button>
          )}
          <button type="button" onClick={toggleEditMode} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #1d5fd6", background: editMode ? "#1d5fd6" : "#fff", color: editMode ? "#fff" : "#1d5fd6" }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>
          <Perm minPerm="manager"><button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm thiết bị</button></Perm>
        </span>
      }
      filters={
        <FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm thiết bị..." }}>
          <ChipFilterDropdown value={category} onChange={setCategory} options={categoryOptions} />
        </FilterBar>
      }
    >
      <DataTable columns={columns} rows={filtered} rowKey={(e) => e.id} loading={pending} emptyTitle="Chưa có thiết bị nào" resizable />

      <FormModal
        open={showForm}
        title={editing ? "Sửa thiết bị" : "Thêm thiết bị"}
        onClose={() => { setShowForm(false); setEditing(null) }}
        onSubmit={() => {
          const form = document.getElementById("tf-equipment-form") as HTMLFormElement | null
          if (form) handleSubmit(new FormData(form))
        }}
        submitting={pending}
      >
        <form key={editing?.id ?? "new"} id="tf-equipment-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên thiết bị *
            <input name="name" required defaultValue={editing?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Mã
              <input name="code" defaultValue={editing?.code ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Phân loại
              {/* Port cua eq-cat/eq-cat-list ban goc (dong 3712, 6701): input tu do +
                  danh sach goi y (datalist) tu cac danh muc da co, khong ep chon 1 gia tri co san. */}
              <input name="category" list="eq-cat-list" placeholder="VD: Thiết bị đo lường" defaultValue={editing?.category ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
              <datalist id="eq-cat-list">
                {categoryDatalistOptions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Hãng sản xuất
              <input name="manufacturer" defaultValue={editing?.manufacturer ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Dòng máy
              <input name="model" defaultValue={editing?.model ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Trung tâm
              <select name="centerId" defaultValue={editing?.centerId ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="">—</option>
                {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Phòng
              <input name="room" defaultValue={editing?.room ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Đơn giá/giờ
              <input name="hourlyRate" type="number" defaultValue={editing?.hourlyRate ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Trạng thái
              <select name="status" defaultValue={editing?.status ?? "active"} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }}>
                <option value="active">Hoạt động</option>
                <option value="maintenance">Bảo trì</option>
                <option value="broken">Hỏng</option>
                <option value="idle">Ngừng dùng</option>
              </select>
            </label>
          </div>
          <div style={{ display: "flex", gap: 12, borderTop: "1px solid #dfe3e8", paddingTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Ngày hiệu chuẩn gần nhất
              <input type="date" name="calLast" defaultValue={editing?.calLast ? editing.calLast.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Chu kỳ hiệu chuẩn (tháng)
              <input type="number" name="calInterval" min={1} placeholder="VD: 12" defaultValue={editing?.calInterval ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Số chứng chỉ hiệu chuẩn
              <input name="calCert" placeholder="VD: CAL-2026-0012" defaultValue={editing?.calCert ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Đơn vị hiệu chuẩn
              <input name="calVendor" placeholder="VD: Quatest 3" defaultValue={editing?.calVendor ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá thiết bị?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} thiết bị đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default EquipmentView
