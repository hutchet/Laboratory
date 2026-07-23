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
import { IconButton } from "@/shared/ui/icon-button"
import { DirectionIcon } from "@/shared/ui/icons"
import { Perm } from "@/shared/lib/rbac-client"
import {
  saveAuditPlan, deleteAuditPlan,
  saveAuditPhase, deleteAuditPhase,
  saveAuditItem, deleteAuditItem, bulkDeleteAuditItems,
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
  const [editingPhase, setEditingPhase] = useState<AuditPhaseRow | null>(null)
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null)
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(null)
  const [confirmDeletePhaseId, setConfirmDeletePhaseId] = useState<string | null>(null)
  const [itemSelected, setItemSelected] = useState<Set<string>>(new Set())
  const [itemBulkConfirm, setItemBulkConfirm] = useState(false)
  const [itemEditMode, setItemEditMode] = useState(false)
  const [openPlanId, setOpenPlanId] = useState<string>("")
  const [search, setSearch] = useState("")
  const [planSearch, setPlanSearch] = useState("")
  // Port cua apOverviewHidden/apOverviewTitle ban goc (dong ~6033-6035, 6165,
  // 6371-6389): an/hien khoi tong quan + doi ten tieu de, luu tam theo phien
  // xem (khong phai du lieu nghiep vu nen khong can luu server).
  const [overviewHidden, setOverviewHidden] = useState(false)
  const [overviewTitle, setOverviewTitle] = useState("Tổng quan tiến độ")
  const [editingOverviewTitle, setEditingOverviewTitle] = useState(false)
  const [overviewTitleDraft, setOverviewTitleDraft] = useState(overviewTitle)

  // Port cua #page-title.title-back ban goc (giong PlanView.tsx): khi da mo 1
  // ke hoach cu the, tieu de trang tro thanh nut "back" - bam vao tieu de la
  // ve lai danh sach the ke hoach (thay cho nut "‹ Danh sach ke hoach" rieng).
  useEffect(() => {
    const el = document.getElementById("page-title")
    if (!el) return
    if (openPlanId) {
      el.classList.add("title-back")
      el.title = "Quay lại danh sách kế hoạch"
      const handler = () => setOpenPlanId("")
      el.addEventListener("click", handler)
      return () => {
        el.classList.remove("title-back")
        el.removeAttribute("title")
        el.removeEventListener("click", handler)
      }
    }
    el.classList.remove("title-back")
    el.removeAttribute("title")
  }, [openPlanId])

  // CustomSelect dieu khien bang state (cung mau sua nhu PlanView ban ba) —
  // ap dung cho tat ca select trong trang nay: filter chon ke hoach + 3 form popup.
  const [planFormStatus, setPlanFormStatus] = useState("planned")
  const [phaseFormPlanId, setPhaseFormPlanId] = useState("")
  const [itemFormPlanId, setItemFormPlanId] = useState("")
  const [itemFormPhaseId, setItemFormPhaseId] = useState("")
  const [pendingItemPhaseId, setPendingItemPhaseId] = useState<string | null>(null)
  const [itemFormStatus, setItemFormStatus] = useState("planned")

  const visiblePlanId = openPlanId
  const currentPlan = plans.find((p) => p.id === openPlanId) ?? null

  useEffect(() => { if (showPlanForm) setPlanFormStatus("planned") }, [showPlanForm])
  useEffect(() => { if (showPhaseForm) setPhaseFormPlanId(editingPhase?.auditPlanId ?? visiblePlanId) }, [showPhaseForm, visiblePlanId, editingPhase])
  useEffect(() => {
    if (showItemForm) {
      setItemFormPlanId(editingItem?.auditPlanId ?? visiblePlanId)
      setItemFormPhaseId(editingItem?.phaseId ?? pendingItemPhaseId ?? "")
      setItemFormStatus(editingItem?.status ?? "planned")
    }
  }, [showItemForm, editingItem, visiblePlanId, pendingItemPhaseId])
  const scopedItems = useMemo(
    () => items.filter((it) => (!visiblePlanId || it.auditPlanId === visiblePlanId) && (!search || it.name.toLowerCase().includes(search.toLowerCase()) || (it.assignee ?? "").toLowerCase().includes(search.toLowerCase()))),
    [items, visiblePlanId, search],
  )
  const scopedPhases = useMemo(() => phases.filter((p) => !visiblePlanId || p.auditPlanId === visiblePlanId), [phases, visiblePlanId])
  const filteredPlans = useMemo(
    () => plans.filter((p) => !planSearch || p.title.toLowerCase().includes(planSearch.toLowerCase())),
    [plans, planSearch],
  )

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

  // Trend theo data thuc cho 5 the KPI (muc 4d, dua vao AuditItem.createdAt moi bo sung) —
  // cung phong cach voi computeKpiTrend/computeKpiSparklines cua Dashboard: snapshot = chi
  // tinh tren cac hang muc da ton tai (createdAt <= asOf), so sanh hom nay voi 7 ngay truoc.
  const kpiTrends = useMemo(() => {
    const now = Date.now()
    const day = 86400000
    function snapshot(asOfMs: number) {
      const list = scopedItems.filter((it) => new Date(it.createdAt).getTime() <= asOfMs)
      const statuses = list.map((it) => auditAutoStatus(it))
      return {
        total: list.length,
        done: statuses.filter((s) => s === "done").length,
        doing: statuses.filter((s) => s === "doing").length,
        overdue: statuses.filter((s) => s === "overdue").length,
        todo: statuses.filter((s) => s === "todo").length,
      }
    }
    function pctChg(curr: number, prev: number) {
      if (prev === 0) return { pct: curr > 0 ? 100 : 0, up: curr >= prev }
      return { pct: Math.round((Math.abs(curr - prev) / prev) * 100), up: curr >= prev }
    }
    function sparklineFor(key: "total" | "done" | "doing" | "overdue" | "todo") {
      const pts: number[] = []
      for (let i = 6; i >= 0; i--) pts.push(snapshot(now - i * day)[key])
      return pts
    }
    const curr = snapshot(now)
    const prev = snapshot(now - 7 * day)
    const keys = ["total", "done", "doing", "overdue", "todo"] as const
    return Object.fromEntries(keys.map((k) => [k, { ...pctChg(curr[k], prev[k]), sparkline: sparklineFor(k) }])) as Record<typeof keys[number], { pct: number; up: boolean; sparkline: number[] }>
  }, [scopedItems])

  // Muc 5: trang danh sach ke hoach (chua mo ke hoach nao) dang thieu 4 the KPI
  // tong quan toan bo cac ke hoach — bo sung dua tren TOAN BO items/plans (khong
  // loc theo 1 ke hoach), cung cong thuc auditAutoStatus + trend nhu kpi/kpiTrends o tren.
  const planListKpi = useMemo(() => {
    const statuses = items.map((it) => auditAutoStatus(it))
    return {
      totalPlans: plans.length,
      done: statuses.filter((s) => s === "done").length,
      doing: statuses.filter((s) => s === "doing").length,
      overdue: statuses.filter((s) => s === "overdue").length,
    }
  }, [items, plans])

  const planListTrends = useMemo(() => {
    const now = Date.now()
    const day = 86400000
    function snapshot(asOfMs: number) {
      const visiblePlans = plans.filter((p) => true)
      const list = items.filter((it) => new Date(it.createdAt).getTime() <= asOfMs)
      const statuses = list.map((it) => auditAutoStatus(it))
      return {
        totalPlans: visiblePlans.length,
        done: statuses.filter((s) => s === "done").length,
        doing: statuses.filter((s) => s === "doing").length,
        overdue: statuses.filter((s) => s === "overdue").length,
      }
    }
    function pctChg(curr: number, prev: number) {
      if (prev === 0) return { pct: curr > 0 ? 100 : 0, up: curr >= prev }
      return { pct: Math.round((Math.abs(curr - prev) / prev) * 100), up: curr >= prev }
    }
    function sparklineFor(key: "totalPlans" | "done" | "doing" | "overdue") {
      const pts: number[] = []
      for (let i = 6; i >= 0; i--) pts.push(snapshot(now - i * day)[key])
      return pts
    }
    const curr = snapshot(now)
    const prev = snapshot(now - 7 * day)
    const keys = ["totalPlans", "done", "doing", "overdue"] as const
    return Object.fromEntries(keys.map((k) => [k, { ...pctChg(curr[k], prev[k]), sparkline: sparklineFor(k) }])) as Record<typeof keys[number], { pct: number; up: boolean; sparkline: number[] }>
  }, [items, plans])

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
    const input = { id: editingPhase?.id, auditPlanId: String(formData.get("auditPlanId") || ""), name: String(formData.get("name") || ""), order: formData.get("order") ? Number(formData.get("order")) : null }
    startTransition(async () => { await saveAuditPhase(input); setShowPhaseForm(false); setEditingPhase(null) })
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
    startTransition(async () => { await saveAuditItem(input); setShowItemForm(false); setEditingItem(null); setPendingItemPhaseId(null) })
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
    const header = ["Giai đoạn", "Hạng m����c", "Phụ trách", "Bắt đầu KH", "Kết thúc KH", "Bắt đầu TT", "Kết thúc TT", "T.lượng (ngày)", "Trạng thái", "Ghi chú"]
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

  // Port cua .row-chk/.acts (globals.css dong 350-353 ban goc): 2 cot nay LUON
  // co trong bang, chi "visibility:hidden" khi chua bam "Chinh sua" - port dung
  // pattern da chuan hoa o PurchaseView.tsx (khong xoa het cot khoi mang de
  // tranh bang bi nhay do rong khi bam "Chinh sua"/"Xong").
  const itemColumns: Array<DataTableColumn<AuditItemRow>> = [
    {
      key: "sel", header: "", defaultWidth: 44,
      render: (it) => itemEditMode ? <input type="checkbox" checked={itemSelected.has(it.id)} onChange={() => toggleItemSelect(it.id)} onClick={(ev) => ev.stopPropagation()} /> : null,
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
        <span style={{ display: "flex", gap: 8, justifyContent: "flex-end" }} onClick={(ev) => ev.stopPropagation()}>
          <Perm minPerm="dept_head">
            <IconButton icon="edit" variant="ghost" size={30} title="Sửa" onClick={() => { setEditingItem(it); setShowItemForm(true) }} />
            <IconButton icon="delete" variant="danger" size={30} title="Xoá" onClick={() => setConfirmDeleteItemId(it.id)} />
          </Perm>
        </span>
      ) : null,
    },
  ]

  return (
    <PageShell title="Kế hoạch kiểm toán nội bộ">
      {!openPlanId && (
      <>
      <div className="kpis-tier" style={{ marginBottom: 16 }}>
        <KpiCard label="Tổng kế hoạch" value={planListKpi.totalPlans} tone="blue" trend={planListTrends.totalPlans} />
        <KpiCard label="Đang triển khai" value={planListKpi.doing} tone="blue" trend={planListTrends.doing} />
        <KpiCard label="Hoàn thành" value={planListKpi.done} tone="success" trend={planListTrends.done} />
        <KpiCard label="Quá hạn" value={planListKpi.overdue} tone="danger" trend={planListTrends.overdue} />
      </div>
      <div className="section-head">
        <h3 style={{ fontSize: 14, margin: 0 }}>Kế hoạch</h3>
        <div className="tools">
          <FilterBar search={{ value: planSearch, onChange: setPlanSearch, placeholder: "Tìm kế hoạch…" }} />
          <button type="button" className="btn-pri" onClick={() => setShowPlanForm(true)}>+ Kế hoạch</button>
        </div>
      </div>
      {filteredPlans.length === 0 ? (
        <div className="empty">Chưa có kế hoạch nào.</div>
      ) : (
        // y/c: trang danh sach the (card list) cho Ke hoach kiem dinh, dung dung
        // khuon mau hub-card cua the Trung tam (EquipmentView.tsx #eq-center-cards)
        // thay cho bang DataTable cu - bam vao 1 the de chon lam ke hoach dang xem
        // (giu nguyen logic setActivePlanId/visiblePlanId hien co). Luoi nay dung
        // chuan 4 the/hang PC - 3/laptop - 2/ipad - 1/mobile (CSS #ap-plan-cards).
        <div id="ap-plan-cards">
          {filteredPlans.map((p) => {
            const initial = p.title.trim().slice(0, 2).toUpperCase() || "KH"
            return (
              <div key={p.id} className="hub-card" onClick={() => setOpenPlanId(p.id)}>
                <div className="hub-top">
                  <div className="hub-icon">{initial}</div>
                  <div className="hub-title"><h4>{p.title}</h4><p>{p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString("vi-VN") : "Chưa có ngày dự kiến"}</p></div>
                  <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                </div>
                <div className="hub-tags">
                  <StatusBadge label={AUDIT_STATUS_LABEL[p.status ?? ""] ?? p.status ?? "—"} tone={planStatusTone(p.status)} />
                </div>
                <div className="hub-stats">
                  <div className="hub-stat"><b>{p.phaseCount}</b><span>Giai đoạn</span></div>
                  <div className="hub-stat"><b>{p.itemCount}</b><span>Hạng mục</span></div>
                </div>
                <Perm minPerm="dept_head">
                  <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                    <button type="button" className="btn-line" style={{ flex: 1 }} onClick={() => setOpenPlanId(p.id)}>Xem chi tiết</button>
                    <button type="button" className="btn-line" onClick={() => setConfirmDeletePlanId(p.id)}>Xoá</button>
                  </div>
                </Perm>
              </div>
            )
          })}
        </div>
      )}
      </>
      )}

      {openPlanId && currentPlan && (
        <>
          <div className="ch" style={{ margin: "0 0 16px" }}>
            <div><h3 style={{ margin: 0 }}>{currentPlan.title}</h3><span>{currentPlan.scheduledAt ? new Date(currentPlan.scheduledAt).toLocaleDateString("vi-VN") : "Chưa có ngày dự kiến"}</span></div>
          </div>
          <div className="kpis-tier" style={{ marginBottom: 20 }}>
            <KpiCard label="Tổng hạng mục" value={kpi.total} tone="blue" trend={kpiTrends.total} />
            <KpiCard label="Hoàn thành" value={kpi.done} tone="success" trend={kpiTrends.done} />
            <KpiCard label="Đang triển khai" value={kpi.doing} tone="warning" trend={kpiTrends.doing} />
            <KpiCard label="Quá hạn" value={kpi.overdue} tone="danger" trend={kpiTrends.overdue} />
          </div>

          {overviewHidden ? (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <button type="button" className="btn-line" onClick={() => setOverviewHidden(false)}>+ Hiện lại phần tổng quan</button>
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
                  <button type="button" className="txt-act" onClick={() => { setOverviewTitleDraft(overviewTitle); setEditingOverviewTitle(true) }}>Sửa</button>
                  <button type="button" className="txt-act del" onClick={() => { if (window.confirm("Ẩn phần tổng quan này?")) setOverviewHidden(true) }}>Xóa</button>
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
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "#444" }}>Tải công việc theo phụ trách</div>
              {workload.length === 0 ? <div style={{ color: "#8a8f98", fontSize: 13 }}>Chưa có dữ liệu.</div> : workload.map(([name, count]) => (
                <div key={name} className="pl-hbar-row">
                  <span className="pl-hbar-label" title={name}>{name}</span>
                  <div className="pl-hbar-track"><div className="pl-hbar-fill" style={{ width: `${Math.round((count / maxWorkload) * 100)}%`, background: "var(--pri)" }} /></div>
                  <span className="pl-hbar-val">{count}</span>
                </div>
              ))}
            </div>
            </div>
          </div>
          )}

          {/* Gantt keo dan het chieu ngang man hinh (khong con chia cot voi panel
              workload rieng - workload da gop vao khoi tong quan phia tren, giong
              cau truc PlanView.tsx). minWidth:0 giu nguyen de .pl-gantt-wrap
              (overflow:auto) cuon rieng thay vi bi .main{{overflow-x:hidden}} cat mat. */}
          <div style={{ minWidth: 0, overflow: "hidden", marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Tiến độ (Gantt)</h3>
            <AuditGanttChart items={scopedItems} phases={scopedPhases} onEditItem={(it) => { setEditingItem(it); setShowItemForm(true) }} />
          </div>

          {/* Port cua renderApPhaseList() ban goc (dong ~6262-6288): danh sach
              cac the "hang muc" (giai doan), rieng biet voi bang chi tiet dau
              viec phia duoi - truoc day bi thieu hoan toan so voi file HTML goc. */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="ch">
              <div><h3>Kế hoạch theo hạng mục</h3><span>{scopedPhases.length} hạng mục</span></div>
            </div>
            <Perm minPerm="dept_head">
              <div style={{ marginBottom: 12 }}>
                <button type="button" className="btn-pri" onClick={() => { setEditingPhase(null); setShowPhaseForm(true) }}>+ Thêm hạng mục</button>
              </div>
            </Perm>
            {scopedPhases.length === 0 ? (
              <div className="empty">Chưa có hạng mục nào.</div>
            ) : scopedPhases.map((ph) => {
              const phItems = scopedItems.filter((it) => it.phaseId === ph.id)
              const done = phItems.filter((it) => auditAutoStatus(it) === "done").length
              return (
                <div key={ph.id} className="pl-pack-card">
                  <div className="ph">
                    <b>{ph.name}</b>
                    <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{done}/{phItems.length} hoàn thành</span>
                    <span style={{ flex: 1 }} />
                    <Perm minPerm="dept_head">
                      <button type="button" className="btn-line" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => { setEditingItem(null); setPendingItemPhaseId(ph.id); setShowItemForm(true) }}>+ Hạng mục</button>
                      <button type="button" className="txt-act" onClick={() => { setEditingPhase(ph); setShowPhaseForm(true) }}>Sửa</button>
                      <button type="button" className="txt-act del" onClick={() => setConfirmDeletePhaseId(ph.id)}>Xóa hạng mục</button>
                    </Perm>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {openPlanId && currentPlan && (
      <>
      <h3 style={{ fontSize: 14, margin: "24px 0 8px" }}>Chi tiết đầu việc</h3>
      <div style={{ marginBottom: 12 }}>
        <FilterBar search={{ value: search, onChange: setSearch, placeholder: "Tìm theo tên hạng mục hoặc phụ trách…" }}>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button type="button" className="btn-line" onClick={exportCsv}>Xuất Excel (CSV)</button>
            <Perm minPerm="dept_head">
              {itemEditMode && (
                <button type="button" className="btn-danger" disabled={!itemSelected.size} onClick={() => setItemBulkConfirm(true)} style={{ opacity: itemSelected.size ? 1 : 0.5 }}>Xoá mục đã chọn</button>
              )}
              <button type="button" className={itemEditMode ? "btn-success" : "btn-line"} onClick={toggleItemEditMode}>{itemEditMode ? "Xong" : "Chỉnh sửa"}</button>
              <button type="button" className="btn-line" onClick={() => { setEditingPhase(null); setShowPhaseForm(true) }}>+ Giai đoạn</button>
              <button type="button" className="btn-pri" onClick={() => { setEditingItem(null); setPendingItemPhaseId(null); setShowItemForm(true) }}>+ Thêm hạng mục</button>
            </Perm>
          </div>
        </FilterBar>
      </div>
      <DataTable columns={itemColumns} rows={scopedItems} rowKey={(it) => it.id} onRowClick={(row) => { setEditingItem(row); setShowItemForm(true) }} loading={pending} emptyTitle="Chưa có hạng mục nào" resizable />
      </>
      )}

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

      <FormModal open={showPhaseForm} title={editingPhase ? "Sửa hạng mục" : "Thêm hạng mục"} onClose={() => { setShowPhaseForm(false); setEditingPhase(null) }} onSubmit={() => { const f = document.getElementById("tf-auditphase-form") as HTMLFormElement | null; if (f) submitPhase(new FormData(f)) }} submitting={pending}>
        <form key={editingPhase?.id ?? "new"} id="tf-auditphase-form" onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="hidden" name="auditPlanId" value={phaseFormPlanId} />
          <div className="field">
            <label>Kế hoạch *</label>
            <CustomSelect value={phaseFormPlanId} onChange={setPhaseFormPlanId} width="100%" options={[{ value: "", label: "—" }, ...plans.map((p) => ({ value: p.id, label: p.title }))]} />
          </div>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Tên hạng mục *
            <input name="name" required defaultValue={editingPhase?.name ?? ""} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>Thứ tự
            <input type="number" name="order" defaultValue={editingPhase?.order ?? undefined} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
          </label>
        </form>
      </FormModal>

      <FormModal open={showItemForm} title={editingItem ? "Sửa hạng mục" : "Thêm hạng mục"} onClose={() => { setShowItemForm(false); setEditingItem(null); setPendingItemPhaseId(null) }} onSubmit={() => { const f = document.getElementById("tf-audititem-form") as HTMLFormElement | null; if (f) submitItem(new FormData(f)) }} submitting={pending}>
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
      <ConfirmDialog open={!!confirmDeletePhaseId} title="Xoá hạng mục kế hoạch?" description="Toàn bộ đầu việc thuộc hạng mục này cũng sẽ bị xoá." danger onConfirm={() => { const id = confirmDeletePhaseId!; startTransition(async () => { await deleteAuditPhase(id); setConfirmDeletePhaseId(null) }) }} onCancel={() => setConfirmDeletePhaseId(null)} />
      <ConfirmDialog open={itemBulkConfirm} title="Xoá các hạng mục đã chọn?" description={`Sẽ xoá ${itemSelected.size} hạng mục đã chọn. Hành động này không thể hoàn tác.`} danger onConfirm={confirmItemBulkDelete} onCancel={() => setItemBulkConfirm(false)} />
    </PageShell>
  )
}

export default AuditPlanView
