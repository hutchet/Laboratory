"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { KpiCard } from "@/shared/ui/kpi-card"
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table"
import { FormModal } from "@/shared/ui/form-modal"
import { CustomSelect } from "@/shared/ui/custom-select"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { StatusBadge } from "@/shared/ui/status-badge"
import { Perm } from "@/shared/lib/rbac-client"
import {
  saveAuditPlan, deleteAuditPlan,
  saveAuditPhase, deleteAuditPhase,
  saveAuditItem, deleteAuditItem, bulkDeleteAuditItems,
  seedIso17025Plan,
} from "../actions"
import { AUDIT_STATUS_LABEL, AUDIT_STATUS_COLOR, auditAutoStatus, type AuditPlanRow, type AuditPhaseRow, type AuditItemRow } from "../types"
import { AuditGanttChart } from "./AuditGanttChart"
import { DonutSvg } from "@/shared/ui/donut-svg"

// Port cua renderAuditPlan() ban goc (dong 6150-6156): donut trang thai
// dau viec dung chung voi Dashboard/Plan.
const AP_STATUS_DONUT_KEYS = ["done", "doing", "overdue", "todo"] as const

function planStatusTone(status: string | null): "neutral" | "info" | "success" {
  if (status === "done") return "success"
  if (status === "in_progress") return "info"
  return "neutral"
}
function autoStatusTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "done") return "success"
  if (status === "doing") return "info"
  if (status === "overdue") return "danger"
  return "neutral"
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AuditPlanView({
  plans, phases, items,
}: { plans: AuditPlanRow[]; phases: AuditPhaseRow[]; items: AuditItemRow[] }) {
  const [pending, startTransition] = useTransition()
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [showPhaseForm, setShowPhaseForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<AuditItemRow | null>(null)
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null)
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null)
  const [itemSelected, setItemSelected] = useState<Set<string>>(new Set())
  const [itemBulkConfirm, setItemBulkConfirm] = useState(false)
  const [itemEditMode, setItemEditMode] = useState(false)
  const [activePlanId, setActivePlanId] = useState<string>("")
  const [search, setSearch] = useState("")
  // Port cua apOverviewHidden/apOverviewTitle ban goc (dong ~6033-6035, 6165,
  // 6371-6389): an/hien khoi tong quan + doi ten tieu de, luu tam theo phien
  // xem (khong phai du lieu nghiep vu nen khong can luu server).
  const [overviewHidden, setOverviewHidden] = useState(false)
  const [overviewTitle, setOverviewTitle] = useState("Tổng quan tiến độ ISO 17025")
  const [editingOverviewTitle, setEditingOverviewTitle] = useState(false)
  const [overviewTitleDraft, setOverviewTitleDraft] = useState(overviewTitle)

  // CustomSelect dieu khien bang state (cung mau sua nhu PlanView ban ba) —
  // ap dung cho tat ca select trong trang nay: filter chon ke hoach + 3 form popup.
  const [planFormStatus, setPlanFormStatus] = useState("planned")
  const [phaseFormPlanId, setPhaseFormPlanId] = useState("")
  const [itemFormPlanId, setItemFormPlanId] = useState("")
  const [itemFormPhaseId, setItemFormPhaseId] = useState("")
  const [itemFormStatus, setItemFormStatus] = useState("planned")

  const visiblePlanId = activePlanId || plans[0]?.id || ""

  useEffect(() => { if (showPlanForm) setPlanFormStatus("planned") }, [showPlanForm])
  useEffect(() => { if (showPhaseForm) setPhaseFormPlanId(visiblePlanId) }, [showPhaseForm, visiblePlanId])
  useEffect(() => {
    if (showItemForm) {
      setItemFormPlanId(editingItem?.auditPlanId ?? visiblePlanId)
      setItemFormPhaseId(editingItem?.phaseId ?? "")
      setItemFormStatus(editingItem?.status ?? "planned")
    }
  }, [showItemForm, editingItem, visiblePlanId])
  const scopedItems = useMemo(
    () => items.filter((it) => (!visiblePlanId || it.auditPlanId === visiblePlanId) && (!search || it.name.toLowerCase().includes(search.toLowerCase()) || (it.assignee ?? "").toLowerCase().includes(search.toLowerCase()))),
    [items, visiblePlanId, search],
  )
  const scopedPhases = useMemo(() => phases.filter((p) => !visiblePlanId || p.auditPlanId === visiblePlanId), [phases, visiblePlanId])

  const kpi = useMemo(() => {
    const statuses = scopedItems.map((it) => auditAutoStatus(it))
    return {
      total: scopedItems.length,
      done: statuses.filter((s) => s === "done").length,
      doing: statuses.filter((s) => s === "doing").length,
      overdue: statuses.filter((s) => s === "overdue").length,
      todo: statuses.filter((s) => s === "todo").length,
    }
  }, [scopedItems])

  const workload = useMemo(() => {
    const map = new Map<string, number>()
    scopedItems.forEach((it) => {
      const key = it.assignee || "Chưa gán"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [scopedItems])
  const maxWorkload = Math.max(1, ...workload.map(([, n]) => n))
  const statusDonutSegments = useMemo(
    () => AP_STATUS_DONUT_KEYS.map((k) => ({ key: k, value: kpi[k] || 0, color: AUDIT_STATUS_COLOR[k] })).filter((s) => s.value > 0),
    [kpi],
  )

  function submitPlan(formData: FormData) {
    const input = { title: String(formData.get("title") || ""), scheduledAt: String(formData.get("scheduledAt") || "") || null, status: String(formData.get("status") || "planned") }
    startTransition(async () => { await saveAuditPlan(input); setShowPlanForm(false) })
  }
  function submitPhase(formData: FormData) {
    const input = { auditPlanId: String(formData.get("auditPlanId") || ""), name: String(formData.get("name") || ""), order: formData.get("order") ? Number(formData.get("order")) : null }
    startTransition(async () => { await saveAuditPhase(input); setShowPhaseForm(false) })
  }
  function submitItem(formData: FormData) {
    const input = {
      id: editingItem?.id,
      auditPlanId: String(formData.get("auditPlanId") || ""),
      phaseId: String(formData.get("phaseId") || "") || null,
      name: String(formData.get("name") || ""),
      assignee: String(formData.get("assignee") || ""),
      status: String(formData.get("status") || "planned"),
      planStart: String(formData.get("planStart") || "") || null,
      planEnd: String(formData.get("planEnd") || "") || null,
      actualStart: String(formData.get("actualStart") || "") || null,
      actualEnd: String(formData.get("actualEnd") || "") || null,
      note: String(formData.get("note") || ""),
    }
    startTransition(async () => { await saveAuditItem(input); setShowItemForm(false); setEditingItem(null) })
  }
  function toggleItemSelect(id: string) {
    setItemSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleItemEditMode() {
    setItemEditMode((v) => { if (v) setItemSelected(new Set()); return !v })
  }
  function confirmItemBulkDelete() {
    const ids = Array.from(itemSelected)
    startTransition(async () => { await bulkDeleteAuditItems(ids); setItemSelected(new Set()); setItemBulkConfirm(false) })
  }
  function handleSeed() {
    startTransition(async () => { await seedIso17025Plan() })
  }
  // Cong thuc T.luong (ngay) port tu renderAuditPlan ban goc (dua tren
  // planStart/planEnd, khong luu rieng field "dur" vi model hien tai chua co).
  function itemDurationDays(it: AuditItemRow): number | null {
    if (!it.planStart || !it.planEnd) return null
    const ms = new Date(it.planEnd.slice(0, 10)).getTime() - new Date(it.planStart.slice(0, 10)).getTime()
    return Math.round(ms / 86400000) + 1
  }

  function exportCsv() {
    // Sua loi header/du lieu bi lech cot: header cu ghi "No" nhung gia tri
    // thuc te la ten Giai doan; bo sung cot T.luong (ngay) cho khop voi bang
    // chi tiet/popup (dung 10 cot nhu renderAuditPlan/openApTaskForm ban goc).
    const header = ["Giai đoạn", "Hạng mục", "Phụ trách", "Bắt đầu KH", "Kết thúc KH", "Bắt đầu TT", "Kết thúc TT", "T.lượng (ngày)", "Trạng thái", "Ghi chú"]
    const rows = scopedItems.map((it) => [
      it.phase?.name ?? "",
      it.name,
      it.assignee ?? "",
      it.planStart ? it.planStart.slice(0, 10) : "",
      it.planEnd ? it.planEnd.slice(0, 10) : "",
      it.actualStart ? it.actualStart.slice(0, 10) : "",
      it.actualEnd ? it.actualEnd.slice(0, 10) : "",
      itemDurationDays(it) ?? "",
      AUDIT_STATUS_LABEL[auditAutoStatus(it)],
      it.note ?? "",
    ])
    downloadCsv("audit-plan.csv", [header, ...rows])
  }

  const planColumns: Array<DataTableColumn<AuditPlanRow>> = [
    { key: "title", header: "Kế hoạch", render: (p) => <button type="button" onClick={() => setActivePlanId(p.id)} style={{ border: "none", background: "none", padding: 0, fontWeight: 600, color: p.id === visiblePlanId ? "#1d5fd6" : "#1b1f24", cursor: "pointer", textAlign: "left" }}>{p.title}</button> },
    { key: "scheduledAt", header: "Ngày dự kiến", render: (p) => (p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString("vi-VN") : "—") },
    { key: "phaseCount", header: "Giai đoạn", align: "right", render: (p) => p.phaseCount },
    { key: "itemCount", header: "Hạng mục", align: "right", render: (p) => p.itemCount },
    { key: "status", header: "Trạng thái", render: (p) => <StatusBadge label={AUDIT_STATUS_LABEL[p.status ?? ""] ?? p.status ?? "—"} tone={planStatusTone(p.status)} /> },
    {
      key: "actions", header: "", align: "right",
      render: (p) => <Perm minPerm="dept_head"><button type="button" onClick={() => setConfirmDeletePlanId(p.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button></Perm>,
    },
  ]

  // Port cua .row-chk/.acts (globals.css dong 350-353 ban goc): 2 cot nay LUON
  // co trong bang, chi "visibility:hidden" khi chua bam "Chinh sua" - port dung
  // pattern da chuan hoa o PurchaseView.tsx (khong xoa het cot khoi mang de
  // tranh bang bi nhay do rong khi bam "Chinh sua"/"Xong").
  const itemColumns: Array<DataTableColumn<AuditItemRow>> = [
    {
      key: "sel", header: "", defaultWidth: 44,
      render: (it) => itemEditMode ? <input type="checkbox" checked={itemSelected.has(it.id)} onChange={() => toggleItemSelect(it.id)} /> : null,
    },
    // Cot STT port cua renderAuditPlan ban goc - truoc day bi bo sot khi gop
    // cac hang muc thanh 1 bang dep (giong fix da ap dung o PurchaseView.tsx).
    { key: "stt", header: "STT", defaultWidth: 44, render: (it) => scopedItems.findIndex((x) => x.id === it.id) + 1 },
    { key: "phase", header: "Giai đoạn", render: (it) => it.phase?.name ?? "—" },
    { key: "name", header: "Hạng mục", render: (it) => <span style={{ fontWeight: 600 }}>{it.name}</span> },
    { key: "assignee", header: "Phụ trách", render: (it) => it.assignee ?? "—" },
    { key: "planStart", header: "BD KH", render: (it) => (it.planStart ? it.planStart.slice(0, 10) : "—") },
    { key: "planEnd", header: "KT KH", render: (it) => (it.planEnd ? it.planEnd.slice(0, 10) : "—") },
    { key: "actualStart", header: "BD TT", render: (it) => (it.actualStart ? it.actualStart.slice(0, 10) : "—") },
    { key: "actualEnd", header: "KT TT", render: (it) => (it.actualEnd ? it.actualEnd.slice(0, 10) : "—") },
    // Cot "T.luong (ngay)" port cua renderAuditPlan ban goc - truoc day bi bo sot.
    { key: "duration", header: "T.lượng", align: "right", render: (it) => itemDurationDays(it) ?? "—" },
    { key: "status", header: "Trạng thái", render: (it) => { const s = auditAutoStatus(it); return <StatusBadge label={AUDIT_STATUS_LABEL[s]} tone={autoStatusTone(s)} /> } },
    { key: "note", header: "Ghi chú", render: (it) => <span style={{ color: "#6b7280" }}>{it.note ?? "—"}</span> },
    {
      key: "actions", header: "", align: "right",
      render: (it) => itemEditMode ? (
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Perm minPerm="dept_head"><button type="button" onClick={() => { setEditingItem(it); setShowItemForm(true) }} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer" }}>Sửa</button>
          <button type="button" onClick={() => setConfirmDeleteItemId(it.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>Xoá</button></Perm>
        </span>
      ) : null,
    },
  ]

  return (
    <PageShell
      title="Kế hoạch kiểm toán nội bộ"
      actions={(
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={handleSeed} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #1d5fd6", background: "#fff", color: "#1d5fd6" }}>+ Tạo từ mẫu ISO 17025</button>
          <button type="button" onClick={() => setShowPlanForm(true)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Kế hoạch</button>
        </div>
      )}
    >
      <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Kế hoạch</h3>
      <DataTable columns={planColumns} rows={plans} rowKey={(p) => p.id} loading={pending} emptyTitle="Chưa có kế hoạch nào" />

      {plans.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 12, margin: "20px 0" }}>
            <KpiCard label="Tổng hạng mục" value={kpi.total} tone="neutral" />
            <KpiCard label="Hoàn thành" value={kpi.done} tone="success" />
            <KpiCard label="Đang triển khai" value={kpi.doing} tone="warning" />
            <KpiCard label="Quá hạn" value={kpi.overdue} tone="danger" />
            <KpiCard label="Chưa bắt đầu" value={kpi.todo} tone="neutral" />
          </div>

          {overviewHidden ? (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <button type="button" onClick={() => setOverviewHidden(false)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px dashed #dfe3e8", background: "#fff", color: "#1d5fd6", fontSize: 12.5 }}>+ Hiện lại phần tổng quan</button>
            </div>
          ) : (
          <div style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              {editingOverviewTitle ? (
                <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
                  <input value={overviewTitleDraft} onChange={(e) => setOverviewTitleDraft(e.target.value)} style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid #dfe3e8", fontSize: 13, fontWeight: 700 }} />
                  <button type="button" onClick={() => { setOverviewTitle(overviewTitleDraft || overviewTitle); setEditingOverviewTitle(false) }} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#1d5fd6", color: "#fff", fontSize: 12 }}>Lưu</button>
                  <button type="button" onClick={() => { setOverviewTitleDraft(overviewTitle); setEditingOverviewTitle(false) }} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #dfe3e8", background: "#fff", fontSize: 12 }}>Hủy</button>
                </div>
              ) : (
                <div style={{ fontSize: 14, fontWeight: 700 }}>{overviewTitle}</div>
              )}
              {!editingOverviewTitle && (
                <span style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => { setOverviewTitleDraft(overviewTitle); setEditingOverviewTitle(true) }} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer", fontSize: 12.5 }}>Sửa</button>
                  <button type="button" onClick={() => { if (window.confirm("Ẩn phần tổng quan này?")) setOverviewHidden(true) }} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer", fontSize: 12.5 }}>Xóa</button>
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 16, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <DonutSvg size={100} segments={statusDonutSegments.map((s) => ({ value: s.value, color: s.color }))} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: "#444" }}>Trạng thái đầu việc</div>
                {AP_STATUS_DONUT_KEYS.map((k) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginBottom: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: AUDIT_STATUS_COLOR[k], display: "inline-block" }} />
                    {AUDIT_STATUS_LABEL[k]}: <b>{kpi[k] || 0}</b>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: "#8a8f98", marginBottom: 6 }}>Tỷ lệ hoàn thành</div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>{kpi.total ? Math.round((kpi.done / kpi.total) * 100) : 0}%</div>
              <div style={{ fontSize: 13, color: "#8a8f98", margin: "10px 0 6px" }}>Số nhóm hạng mục</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{scopedPhases.length} nhóm</div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#444" }}>Khối lượng theo người phụ trách</div>
              {workload.length === 0 && <div style={{ color: "#8a8f98", fontSize: 13 }}>Chưa có dữ liệu.</div>}
              {workload.slice(0, 4).map(([name, count]) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span>{name}</span><span style={{ fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
            </div>
          </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Tiến đứ (Gantt)</h3>
              <AuditGanttChart items={scopedItems} phases={scopedPhases} onEditItem={(it) => { setEditingItem(it); setShowItemForm(true) }} />
            </div>
            <div>
              <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Tải công việc theo phụ trách</h3>
              <div style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {workload.length === 0 && <div style={{ color: "#8a8f98", fontSize: 13 }}>Chưa có dữ liệu.</div>}
                {workload.map(([name, count]) => (
                  <div key={name}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                      <span>{name}</span><span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ background: "#eef1f5", borderRadius: 4, height: 6 }}>
                      <div style={{ background: "#1d5fd6", borderRadius: 4, height: 6, width: `${(count / maxWorkload) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "24px 0 8px" }}>
        <h3 style={{ fontSize: 14, margin: 0 }}>Hạng mục kiểm toán</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={exportCsv} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff" }}>Xuất Excel (CSV)</button>
          <Perm minPerm="dept_head">
            {itemEditMode && (
              <button type="button" disabled={!itemSelected.size} onClick={() => setItemBulkConfirm(true)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #c62828", background: "#fff", color: "#c62828", opacity: itemSelected.size ? 1 : 0.5 }}>Xoá mục đã chọn</button>
            )}
            <button type="button" onClick={toggleItemEditMode} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #1d5fd6", background: itemEditMode ? "#1d5fd6" : "#fff", color: itemEditMode ? "#fff" : "#1d5fd6" }}>{itemEditMode ? "Xong" : "Chỉnh sửa"}</button>
            <button type="button" onClick={() => setShowPhaseForm(true)} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #1d5fd6", background: "#fff", color: "#1d5fd6" }}>+ Giai đoạn</button>
            <button type="button" onClick={() => { setEditingItem(null); setShowItemForm(true) }} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm hạng mục</button>
          </Perm>
        </div>
      </div>
      <FilterBar search={{ value: search, onChange: setSearch, placeholder: "Tìm theo tên hạng mục hoặc phụ trách…" }}>
        <CustomSelect value={visiblePlanId} onChange={setActivePlanId} width={220} options={plans.map((p) => ({ value: p.id, label: p.title }))} />
      </FilterBar>
      <DataTable columns={itemColumns} rows={scopedItems} rowKey={(it) => it.id} loading={pending} emptyTitle="Chưa có hạng mục nào" />

      <FormModal open={showPlanForm} title="Thêm kế hoạch kiểm toán" onClose={() => setShowPlanForm(false)} onSubmit={() => { const f = document.getElementById("tf-auditplan-form") as HTMLFormElement | null; if (f) submitPlan(new FormData(f)) }} submitting={pending}>
        <form id="tf-auditplan-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên kế hoạch *
            <input name="title" required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Ngày dự kiến
            <input type="date" name="scheduledAt" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <input type="hidden" name="status" value={planFormStatus} />
          <div className="field">
            <label>Trạng thái</label>
            <CustomSelect value={planFormStatus} onChange={setPlanFormStatus} width="100%" options={[{ value: "planned", label: "Đã lập kế hoạch" }, { value: "in_progress", label: "Đang thực hiện" }, { value: "done", label: "Hoàn thành" }]} />
          </div>
        </form>
      </FormModal>

      <FormModal open={showPhaseForm} title="Thêm giai đoạn" onClose={() => setShowPhaseForm(false)} onSubmit={() => { const f = document.getElementById("tf-auditphase-form") as HTMLFormElement | null; if (f) submitPhase(new FormData(f)) }} submitting={pending}>
        <form id="tf-auditphase-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="auditPlanId" value={phaseFormPlanId} />
          <div className="field">
            <label>Kế hoạch *</label>
            <CustomSelect value={phaseFormPlanId} onChange={setPhaseFormPlanId} width="100%" options={[{ value: "", label: "—" }, ...plans.map((p) => ({ value: p.id, label: p.title }))]} />
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên giai đoạn *
            <input name="name" required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Thứ tự
            <input type="number" name="order" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
        </form>
      </FormModal>

      <FormModal open={showItemForm} title={editingItem ? "Sửa hạng mục" : "Thêm hạng mục"} onClose={() => { setShowItemForm(false); setEditingItem(null) }} onSubmit={() => { const f = document.getElementById("tf-audititem-form") as HTMLFormElement | null; if (f) submitItem(new FormData(f)) }} submitting={pending} width={640}>
        <form key={editingItem?.id ?? "new"} id="tf-audititem-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="auditPlanId" value={itemFormPlanId} />
          <input type="hidden" name="phaseId" value={itemFormPhaseId} />
          <div className="field">
            <label>Kế hoạch *</label>
            <CustomSelect value={itemFormPlanId} onChange={setItemFormPlanId} width="100%" options={[{ value: "", label: "—" }, ...plans.map((p) => ({ value: p.id, label: p.title }))]} />
          </div>
          <div className="field">
            <label>Giai đoạn</label>
            <CustomSelect value={itemFormPhaseId} onChange={setItemFormPhaseId} width="100%" options={[{ value: "", label: "—" }, ...phases.map((ph) => ({ value: ph.id, label: ph.name }))]} />
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên hạng mục *
            <input name="name" required defaultValue={editingItem?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Phụ trách
              <input name="assignee" defaultValue={editingItem?.assignee ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <div className="field" style={{ flex: 1 }}>
              <label>Trạng thái</label>
              <input type="hidden" name="status" value={itemFormStatus} />
              <CustomSelect value={itemFormStatus} onChange={setItemFormStatus} width="100%" options={[{ value: "planned", label: "Đã lập kế hoạch" }, { value: "in_progress", label: "Đang thực hiện" }, { value: "done", label: "Hoàn thành" }]} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Bắt đầu KH
              <input type="date" name="planStart" defaultValue={editingItem?.planStart ? editingItem.planStart.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Kết thúc KH
              <input type="date" name="planEnd" defaultValue={editingItem?.planEnd ? editingItem.planEnd.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Bắt đầu thực tế
              <input type="date" name="actualStart" defaultValue={editingItem?.actualStart ? editingItem.actualStart.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>Kết thúc thực tế
              <input type="date" name="actualEnd" defaultValue={editingItem?.actualEnd ? editingItem.actualEnd.slice(0, 10) : ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
            </label>
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Ghi chú
            <input name="note" defaultValue={editingItem?.note ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
        </form>
      </FormModal>

      <ConfirmDialog open={!!confirmDeletePlanId} title="Xoá kế hoạch?" description="Các giai đoạn và hạng mục liên quan cũng sẽ bị xoá." danger onConfirm={() => { const id = confirmDeletePlanId!; startTransition(async () => { await deleteAuditPlan(id); setConfirmDeletePlanId(null) }) }} onCancel={() => setConfirmDeletePlanId(null)} />
      <ConfirmDialog open={!!confirmDeleteItemId} title="Xoá hạng mục?" danger onConfirm={() => { const id = confirmDeleteItemId!; startTransition(async () => { await deleteAuditItem(id); setConfirmDeleteItemId(null) }) }} onCancel={() => setConfirmDeleteItemId(null)} />
      <ConfirmDialog open={itemBulkConfirm} title="Xoá các hạng mục đã chọn?" description={`Sẽ xoá ${itemSelected.size} hạng mục đã chọn. Hành động này không thể hoàn tác.`} danger onConfirm={confirmItemBulkDelete} onCancel={() => setItemBulkConfirm(false)} />
    </PageShell>
  )
}

export default AuditPlanView
