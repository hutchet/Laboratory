"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { ChipFilterDropdown, type ChipFilterOption } from "@/shared/ui/chip-filter"
import { CustomSelect } from "@/shared/ui/custom-select"
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

  // CustomSelect dieu khien bang state, khong tu sinh input "name" nhu <select>
  // goc - dong bo lai moi khi mo form (cung mau sua nhu PlanView ban ba).
  const [eqCenterId, setEqCenterId] = useState("")
  const [eqStatus, setEqStatus] = useState("active")

  useEffect(() => {
    if (showForm) {
      setEqCenterId(editing?.centerId ?? "")
      setEqStatus(editing?.status ?? "active")
    }
  }, [showForm, editing])

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
          <Perm minPerm="dept_head"><button type="button" onClick={openNew} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm thiết bị</button></Perm>
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
          <input type="hidden" name="centerId" value={eqCenterId} />
          <input type="hidden" name="status" value={eqStatus} />
          <div className="field">
            <label>Tên thiết bị *</label>
            <input name="name" required defaultValue={editing?.name ?? ""} />
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Mã</label>
              <input name="code" defaultValue={editing?.code ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Phân loại</label>
              {/* Port cua eq-cat/eq-cat-list ban goc (dong 3712, 6701): input tu do +
                  danh sach goi y (datalist) tu cac danh muc da co, khong ep chon 1 gia tri co san. */}
              <input name="category" list="eq-cat-list" placeholder="VD: Thiết bị đo lường" defaultValue={editing?.category ?? ""} />
              <datalist id="eq-cat-list">
                {categoryDatalistOptions.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Hãng sản xuất</label>
              <input name="manufacturer" defaultValue={editing?.manufacturer ?? ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Dòng máy</label>
              <input name="model" defaultValue={editing?.model ?? ""} />
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
          <div className="row" style={{ borderTop: "1px solid #dfe3e8", paddingTop: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Ngày hiệu chuẩn gần nhất</label>
              <input type="date" name="calLast" defaultValue={editing?.calLast ? editing.calLast.slice(0, 10) : ""} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Chu kỳ hiệu chuẩn (tháng)</label>
              <input type="number" name="calInterval" min={1} placeholder="VD: 12" defaultValue={editing?.calInterval ?? ""} />
            </div>
          </div>
          <div className="row">
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

      <ConfirmDialog open={!!confirmDeleteId} title="Xoá thiết bị?" description="Hành động này không thể hoàn tác." danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      <ConfirmDialog open={bulkConfirm} title={`Xoá ${selected.size} thiết bị đã chọn?`} description="Hành động này không thể hoàn tác." danger onConfirm={confirmBulkDelete} onCancel={() => setBulkConfirm(false)} />
    </PageShell>
  )
}

export default EquipmentView
