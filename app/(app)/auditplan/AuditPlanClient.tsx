"use client"

import { Fragment, useMemo, useState, useTransition } from "react"
import { createPlan, addPhase, saveItem, deleteItem, deletePlan } from "./actions"
import { useEscapeClose } from "@/lib/useEscapeClose"

type ItemRow = {
  id: string; name: string; phaseId: string | null; assignee: string | null
  planStart: string | null; planEnd: string | null; actualStart: string | null; actualEnd: string | null
  status: string | null; note: string | null
}
type Plan = { id: string; title: string; status: string | null; phases: { id: string; name: string }[]; items: ItemRow[] }

function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000))
}

function statusLabel(s: string | null) {
  if (s === "done") return "Hoàn thành"
  if (s === "doing") return "Đang triển khai"
  if (s === "overdue") return "Quá hạn"
  return "Chưa bắt đầu"
}

function Donut({ done, doing, overdue, todo }: { done: number; doing: number; overdue: number; todo: number }) {
  const total = done + doing + overdue + todo
  const r = 15.9155
  const circ = 2 * Math.PI * r
  const seg = (n: number) => (total ? (n / total) * circ : 0)
  const doneLen = seg(done); const doingLen = seg(doing); const overdueLen = seg(overdue); const todoLen = seg(todo)
  return (
    <svg width="120" height="120" viewBox="0 0 42 42">
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--line)" strokeWidth="5" />
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--green)" strokeWidth="5" strokeDasharray={`${doneLen} ${circ - doneLen}`} strokeDashoffset="25" transform="rotate(-90 21 21)" />
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--amber)" strokeWidth="5" strokeDasharray={`${doingLen} ${circ - doingLen}`} strokeDashoffset={25 - doneLen} transform="rotate(-90 21 21)" />
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--red)" strokeWidth="5" strokeDasharray={`${overdueLen} ${circ - overdueLen}`} strokeDashoffset={25 - doneLen - doingLen} transform="rotate(-90 21 21)" />
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--pri)" strokeWidth="5" strokeDasharray={`${todoLen} ${circ - todoLen}`} strokeDashoffset={25 - doneLen - doingLen - overdueLen} transform="rotate(-90 21 21)" />
    </svg>
  )
}

type ApZoomLevel = "day" | "week" | "month"

function apIsoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}
function apAddDays(iso: string, delta: number) {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + delta)
  return apIsoDate(d)
}
function apBuildColumns(zoom: ApZoomLevel, focusDate: string): { iso: string; label: string }[] {
  if (zoom === "day") {
    const start = apAddDays(focusDate, -6)
    return Array.from({ length: 14 }, (_, i) => {
      const iso = apAddDays(start, i)
      const d = new Date(iso + "T00:00:00")
      return { iso, label: `${d.getDate()}/${d.getMonth() + 1}` }
    })
  }
  if (zoom === "week") {
    const base = new Date(focusDate.slice(0, 7) + "-01T00:00:00")
    base.setMonth(base.getMonth() - 2)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base)
      d.setMonth(d.getMonth() + i)
      return { iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, label: `Th.${d.getMonth() + 1}/${d.getFullYear()}` }
    })
  }
  const year = Number(focusDate.slice(0, 4))
  return Array.from({ length: 5 }, (_, i) => {
    const y = year - 2 + i
    return { iso: `${y}-01-01`, label: String(y) }
  })
}
function apColIndexForDate(cols: { iso: string }[], zoom: ApZoomLevel, dateIso: string) {
  if (zoom === "day") return cols.findIndex((c) => c.iso === dateIso)
  if (zoom === "week") return cols.findIndex((c) => c.iso.slice(0, 7) === dateIso.slice(0, 7))
  return cols.findIndex((c) => c.iso.slice(0, 4) === dateIso.slice(0, 4))
}
function apBarRange(cols: { iso: string }[], zoom: ApZoomLevel, startIso: string, endIso: string) {
  const sIdxRaw = apColIndexForDate(cols, zoom, startIso)
  const eIdxRaw = apColIndexForDate(cols, zoom, endIso || startIso)
  if (sIdxRaw === -1 && eIdxRaw === -1) return null
  const start = sIdxRaw === -1 ? 0 : sIdxRaw
  const end = eIdxRaw === -1 ? cols.length - 1 : eIdxRaw
  return { start, span: Math.max(1, end - start + 1) }
}
function apStatusColor(status: string | null) {
  if (status === "done") return "var(--green)"
  if (status === "doing") return "var(--amber)"
  if (status === "overdue") return "var(--red)"
  return "var(--pri)"
}
function apEffectiveStatus(it: ItemRow): "done" | "doing" | "overdue" | "todo" {
  const now = new Date()
  if (it.actualEnd) return "done"
  if (it.planEnd && new Date(it.planEnd) < now) return "overdue"
  if (it.planStart && new Date(it.planStart) <= now) return "doing"
  return "todo"
}

export default function AuditPlanClient({ plans }: { plans: Plan[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [showPhaseForm, setShowPhaseForm] = useState(false)
  useEscapeClose(showPhaseForm, () => setShowPhaseForm(false))
  const [editing, setEditing] = useState<ItemRow | null>(null)
  const [showItemForm, setShowItemForm] = useState(false)
  useEscapeClose(showItemForm, () => setShowItemForm(false))
  const [pending, startTransition] = useTransition()

  const active = plans.find((p) => p.id === activeId) ?? null
  const shownPlans = plans.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))

  const stats = useMemo(() => {
    if (!active) return { total: 0, done: 0, doing: 0, overdue: 0, todo: 0, progress: 0 }
    const now = new Date()
    let done = 0, doing = 0, overdue = 0, todo = 0
    for (const it of active.items) {
      if (it.actualEnd) done++
      else if (it.planEnd && new Date(it.planEnd) < now) overdue++
      else if (it.planStart && new Date(it.planStart) <= now) doing++
      else todo++
    }
    const total = active.items.length
    return { total, done, doing, overdue, todo, progress: total ? Math.round((done / total) * 100) : 0 }
  }, [active])

  const workload = useMemo(() => {
    if (!active) return [] as { name: string; count: number }[]
    const map: Record<string, number> = {}
    for (const it of active.items) {
      const key = it.assignee || "Chưa gán"
      map[key] = (map[key] || 0) + 1
    }
    return Object.entries(map).map(([name, count]) => ({ name, count }))
  }, [active])

  function onCreate(formData: FormData) {
    startTransition(async () => { await createPlan(formData); setShowCreate(false) })
  }
  function onAddPhase(formData: FormData) {
    if (!active) return
    formData.set("auditPlanId", active.id)
    startTransition(async () => { await addPhase(formData); setShowPhaseForm(false) })
  }
  function onSaveItem(formData: FormData) {
    if (!active) return
    formData.set("auditPlanId", active.id)
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveItem(formData); setShowItemForm(false); setEditing(null) })
  }
  function onDeleteItem(id: string) {
    if (!confirm("Xóa đầu việc này?")) return
    startTransition(async () => { await deleteItem(id) })
  }
  function onDeletePlan(id: string) {
    if (!confirm("Xóa kế hoạch audit này?")) return
    startTransition(async () => { await deletePlan(id); setActiveId(null) })
  }

  const [zoom, setZoom] = useState<ApZoomLevel>("day")
  const [focusDate, setFocusDate] = useState(() => apIsoDate(new Date()))
  const [showOverview, setShowOverview] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem("tf_auditplan_ovhidden_v1") !== "1"
  })
  const [ovTitleOverride, setOvTitleOverride] = useState<string | null>(() => {
    if (typeof window === "undefined") return null
    return localStorage.getItem("tf_auditplan_ovtitle_v1")
  })
  const [showOvTitleForm, setShowOvTitleForm] = useState(false)
  useEscapeClose(showOvTitleForm, () => setShowOvTitleForm(false))

  const cols = useMemo(() => apBuildColumns(zoom, focusDate), [zoom, focusDate])

  function shiftFocus(delta: number) {
    setFocusDate((d) => {
      if (zoom === "day") return apAddDays(d, delta)
      const dt = new Date(d + "T00:00:00")
      if (zoom === "week") dt.setMonth(dt.getMonth() + delta)
      else dt.setFullYear(dt.getFullYear() + delta)
      return apIsoDate(dt)
    })
  }
  function onSaveOvTitle(formData: FormData) {
    const v = String(formData.get("ovTitle") || "").trim()
    if (v) {
      setOvTitleOverride(v)
      try { localStorage.setItem("tf_auditplan_ovtitle_v1", v) } catch {}
    }
    setShowOvTitleForm(false)
  }
  function onHideOverview() {
    setShowOverview(false)
    try { localStorage.setItem("tf_auditplan_ovhidden_v1", "1") } catch {}
  }
  function onRestoreOverview() {
    setShowOverview(true)
    try { localStorage.setItem("tf_auditplan_ovhidden_v1", "0") } catch {}
  }
  function exportCsv() {
    if (!active) return
    const head = ["No", "Đầu việc", "Người phụ trách", "Bắt đầu KH", "Kết thúc KH", "Bắt đầu TT", "Kết thúc TT", "Thời lượng (ngày)", "Trạng thái", "Ghi chú"]
    const rows = active.items.map((it, idx) => [
      idx + 1, it.name, it.assignee || "", it.planStart ? it.planStart.slice(0, 10) : "", it.planEnd ? it.planEnd.slice(0, 10) : "",
      it.actualStart ? it.actualStart.slice(0, 10) : "", it.actualEnd ? it.actualEnd.slice(0, 10) : "",
      daysBetween(it.planStart, it.planEnd) ?? "", statusLabel(apEffectiveStatus(it)), it.note || "",
    ])
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n")
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ke-hoach-audit-iso17025.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!active) {
    return (
      <section id="page-auditplan">
        <div id="ap-plan-overview">
          <div className="section-head">
            <h3>Kế hoạch audit</h3>
            <div className="tools">
              <div className="search" style={{ maxWidth: 260 }}>
                <input id="ap-plan-search" placeholder="Tìm kế hoạch..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <button className="btn-pri" id="ap-plan-create-btn" onClick={() => setShowCreate(true)}>+ Tạo kế hoạch</button>
            </div>
          </div>
          {showCreate && (
            <div className="card" style={{ marginBottom: 14 }}>
              <form action={onCreate}>
                <div className="row">
                  <div className="field" style={{ flex: 1 }}><label>Tên kế hoạch audit</label><input name="title" placeholder="VD: Kế hoạch audit ISO 17025" required /></div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button type="submit" className="btn-pri" disabled={pending}>Tạo</button>
                  <button type="button" className="btn-line" onClick={() => setShowCreate(false)}>Hủy</button>
                </div>
              </form>
            </div>
          )}
          <div id="ap-plan-cards" className="chips">
            {shownPlans.map((p) => (
              <div key={p.id} className="card" style={{ cursor: "pointer", minWidth: 220 }} onClick={() => setActiveId(p.id)}>
                <div style={{ fontWeight: 600 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{p.items.length} đầu việc · {statusLabel(p.status)}</div>
              </div>
            ))}
            {shownPlans.length === 0 && <div className="empty">Chưa có kế hoạch audit nào.</div>}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section id="page-auditplan">
      <div id="ap-plan-detail-shell">
        <div className="section-head">
          <button className="btn-line" onClick={() => setActiveId(null)}>← Danh sách kế hoạch</button>
          <button className="txt-act del" onClick={() => onDeletePlan(active.id)}>Xóa kế hoạch audit</button>
        </div>
        <div className="grid kpis" style={{ marginBottom: 18 }}>
          <div className="kcard kb"><div className="v" id="ap-k-total">{stats.total}</div><div className="l">Tổng đầu việc</div><div className="s">Trong kế hoạch audit</div></div>
          <div className="kcard kg"><div className="v" id="ap-k-done">{stats.done}</div><div className="l">Hoàn thành</div><div className="s">Đã có ngày kết thúc thực tế</div></div>
          <div className="kcard kp"><div className="v" id="ap-k-doing">{stats.doing}</div><div className="l">Đang triển khai</div><div className="s">Trong khung thời gian kế hoạch</div></div>
          <div className="kcard kr"><div className="v" id="ap-k-overdue">{stats.overdue}</div><div className="l">Quá hạn</div><div className="s">Trễ ngày kết thúc kế hoạch</div></div>
        </div>
        {!showOverview && (
          <div style={{ marginBottom: 18 }} id="ap-overview-restore-row">
            <button className="btn-line" id="ap-ov-restore-btn" onClick={onRestoreOverview}>+ Hiện lại phần tổng quan</button>
          </div>
        )}
        {showOverview && (
        <div className="card" style={{ marginBottom: 18 }} id="ap-overview-card">
          <div className="ch">
            <div>
              {showOvTitleForm ? (
                <form action={onSaveOvTitle} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input name="ovTitle" defaultValue={ovTitleOverride ?? active.title} autoFocus />
                  <button type="submit" className="btn-pri" style={{ padding: "4px 10px", fontSize: 12 }}>Lưu</button>
                  <button type="button" className="btn-line" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setShowOvTitleForm(false)}>Hủy</button>
                </form>
              ) : (
                <h3 id="ap-ov-title">{ovTitleOverride ?? active.title}</h3>
              )}
              <span>Toàn bộ kế hoạch audit theo file Excel</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="txt-act" id="ap-ov-edit-btn" onClick={() => setShowOvTitleForm(true)}>Sửa</button>
              <button className="txt-act del" id="ap-ov-del-btn" onClick={onHideOverview}>Xóa</button>
            </div>
          </div>
          <div className="pl-donut-wrap">
            <div className="pl-donut-col">
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6, textAlign: "center" }}>Trạng thái đầu việc</div>
              <div className="pl-donut-inline">
                <Donut done={stats.done} doing={stats.doing} overdue={stats.overdue} todo={stats.todo} />
                <div className="pl-legend pl-legend-side" id="ap-legend-status">
                  <span className="li"><span className="dot" style={{ background: "var(--green)" }} />Hoàn thành ({stats.done})</span>
                  <span className="li"><span className="dot" style={{ background: "var(--amber)" }} />Đang triển khai ({stats.doing})</span>
                  <span className="li"><span className="dot" style={{ background: "var(--red)" }} />Quá hạn ({stats.overdue})</span>
                  <span className="li"><span className="dot" style={{ background: "var(--pri)" }} />Chưa bắt đầu ({stats.todo})</span>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 170 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Tỷ lệ hoàn thành</div>
              <div className="pctbig" id="ap-k-progress" style={{ marginBottom: 14 }}>{stats.progress}%</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Số nhóm hạng mục (phase)</div>
              <div className="pctbig" style={{ fontSize: 22, color: "var(--ink)" }}><span id="ap-k-phases">{active.phases.length}</span> nhóm</div>
            </div>
            <div style={{ flex: 1, minWidth: 190 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Khối lượng theo người phụ trách</div>
              <div id="ap-pic-workload">
                {workload.map((w) => (<div key={w.name} style={{ fontSize: 12.5, marginBottom: 4 }}>{w.name}: {w.count}</div>))}
                {workload.length === 0 && <div className="empty">Chưa có dữ liệu.</div>}
              </div>
            </div>
          </div>
        </div>
        )}

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="pl-toolbar">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Sơ đồ tiến độ (Gantt) kế hoạch audit ISO 17025</h3>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Theo mốc thời gian kế hoạch (Planning Start → End) của từng đầu việc, nhóm theo hạng mục</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="pl-daynav" id="ap-daynav">
                <button type="button" className="icon-act" onClick={() => shiftFocus(-1)}>‹</button>
                <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {zoom === "day" ? new Date(focusDate + "T00:00:00").toLocaleDateString("vi-VN") : zoom === "week" ? `Tháng ${Number(focusDate.slice(5, 7))}/${focusDate.slice(0, 4)}` : focusDate.slice(0, 4)}
                </span>
                <button type="button" className="icon-act" onClick={() => shiftFocus(1)}>›</button>
              </div>
              <div className="pl-zoom" id="ap-zoom">
                <button type="button" className={zoom === "day" ? "active" : ""} onClick={() => setZoom("day")}>Ngày</button>
                <button type="button" className={zoom === "week" ? "active" : ""} onClick={() => setZoom("week")}>Tháng</button>
                <button type="button" className={zoom === "month" ? "active" : ""} onClick={() => setZoom("month")}>Năm</button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--muted)", flexWrap: "wrap", marginBottom: 10 }}>
            <span><span className="ap-legend-dot" style={{ background: "var(--green)" }} />Hoàn thành</span>
            <span><span className="ap-legend-dot" style={{ background: "var(--amber)" }} />Đang triển khai</span>
            <span><span className="ap-legend-dot" style={{ background: "var(--red)" }} />Quá hạn</span>
            <span><span className="ap-legend-dot" style={{ background: "var(--pri)" }} />Chưa bắt đầu</span>
          </div>
          <div className="pl-gantt-wrap" id="ap-gantt-wrap" style={{ overflowX: "auto" }}>
            {active.items.filter((i) => i.planStart).length === 0 ? (
              <div className="empty" style={{ padding: 20 }}>Chưa có mốc thời gian kế hoạch để vẽ Gantt.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: `190px repeat(${cols.length}, 1fr)`, minWidth: 190 + cols.length * 60 }}>
                <div style={{ gridColumn: 1, gridRow: 1, fontSize: 11, fontWeight: 700, color: "var(--muted)", padding: "4px 8px" }}>Đầu việc</div>
                {cols.map((c, ci) => (
                  <div key={c.iso} style={{ gridColumn: ci + 2, gridRow: 1, fontSize: 11, fontWeight: 700, color: "var(--muted)", textAlign: "center", borderBottom: "1px solid var(--line)", padding: "4px 2px" }}>{c.label}</div>
                ))}
                {active.items.filter((i) => i.planStart).map((it, ri) => {
                  const range = apBarRange(cols, zoom, it.planStart as string, it.planEnd || (it.planStart as string))
                  return (
                    <Fragment key={it.id}>
                      <div style={{ gridColumn: 1, gridRow: ri + 2, fontSize: 12, padding: "6px 8px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                      {cols.map((c) => (
                        <div key={c.iso} style={{ gridRow: ri + 2, borderBottom: "1px solid var(--line)" }} />
                      ))}
                      {range && (
                        <div
                          onClick={() => { setEditing(it); setShowItemForm(true) }}
                          style={{ gridColumn: `${range.start + 2} / span ${range.span}`, gridRow: ri + 2, background: apStatusColor(apEffectiveStatus(it)), borderRadius: 4, margin: "6px 2px", cursor: "pointer", minHeight: 14 }}
                          title={it.name}
                        />
                      )}
                    </Fragment>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="ch"><h3>Kế hoạch theo hạng mục</h3><span id="ap-phase-count">{active.phases.length} hạng mục</span></div>
          <div style={{ marginBottom: 12 }}>
            {!showPhaseForm && <button className="btn-pri" id="ap-add-phase-btn" onClick={() => setShowPhaseForm(true)}>+ Thêm hạng mục</button>}
            {showPhaseForm && (
              <form action={onAddPhase} style={{ display: "flex", gap: 8 }}>
                <input name="name" placeholder="Tên hạng mục" required />
                <button type="submit" className="btn-pri" disabled={pending}>Thêm</button>
                <button type="button" className="btn-line" onClick={() => setShowPhaseForm(false)}>Hủy</button>
              </form>
            )}
          </div>
          <div id="ap-phase-list">
            {active.phases.map((ph) => (
              <div key={ph.id} className="row" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <b>{ph.name}</b><span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>{active.items.filter((i) => i.phaseId === ph.id).length} đầu việc</span>
              </div>
            ))}
            {active.phases.length === 0 && <div className="empty">Chưa có hạng mục.</div>}
          </div>
        </div>

        <div className="card">
          <div className="ch" style={{ padding: 0 }}>
            <div><h3>Chi tiết đầu việc kế hoạch audit ISO 17025</h3><span id="ap-detail-count">{active.items.length} đầu việc</span></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-line" onClick={exportCsv}>⤓ Xuất Excel</button>
              <button type="button" className="btn-pri" onClick={() => { setEditing(null); setShowItemForm(true) }}>+ Thêm đầu việc</button>
            </div>
          </div>

          {showItemForm && (
            <div className="card" style={{ margin: "12px 0", background: "var(--bg)" }}>
              <form action={onSaveItem}>
                <input type="hidden" name="phaseId" value={editing?.phaseId ?? ""} />
                <div className="row">
                  <div className="field" style={{ flex: 2 }}><label>Đầu việc</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
                  <div className="field"><label>Người phụ trách</label><input name="assignee" defaultValue={editing?.assignee ?? ""} /></div>
                  <div className="field">
                    <label>Hạng mục</label>
                    <select name="phaseId" defaultValue={editing?.phaseId ?? ""}>
                      <option value="">-- Không thuộc hạng mục --</option>
                      {active.phases.map((ph) => (<option key={ph.id} value={ph.id}>{ph.name}</option>))}
                    </select>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <div className="field"><label>Bắt đầu KH</label><input type="date" name="planStart" defaultValue={editing?.planStart ? editing.planStart.slice(0, 10) : ""} /></div>
                  <div className="field"><label>Kết thúc KH</label><input type="date" name="planEnd" defaultValue={editing?.planEnd ? editing.planEnd.slice(0, 10) : ""} /></div>
                  <div className="field">
                    <label>Trạng thái</label>
                    <select name="status" defaultValue={editing?.status ?? "todo"}>
                      <option value="todo">Chưa bắt đầu</option>
                      <option value="doing">Đang triển khai</option>
                      <option value="done">Hoàn thành</option>
                      <option value="overdue">Quá hạn</option>
                    </select>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <div className="field" style={{ flex: 1 }}><label>Ghi chú</label><input name="note" defaultValue={editing?.note ?? ""} /></div>
                </div>
                <div className="row" style={{ marginTop: 10 }}>
                  <button type="submit" className="btn-pri" disabled={pending}>{editing ? "Lưu" : "Thêm"}</button>
                  <button type="button" className="btn-line" onClick={() => { setShowItemForm(false); setEditing(null) }}>Hủy</button>
                </div>
              </form>
            </div>
          )}

          <table style={{ marginTop: 12 }}>
            <thead><tr><th>No</th><th>Đầu việc</th><th>Người phụ trách</th><th>Bắt đầu KH</th><th>Kết thúc KH</th><th>Bắt đầu TT</th><th>Kết thúc TT</th><th>T.lượng (ngày)</th><th>Trạng thái</th><th>Ghi chú</th><th>Thao tác</th></tr></thead>
            <tbody id="ap-detail-body">
              {active.items.map((it, idx) => (
                <tr key={it.id}>
                  <td>{idx + 1}</td>
                  <td>{it.name}</td>
                  <td>{it.assignee ?? "-"}</td>
                  <td>{it.planStart ? new Date(it.planStart).toLocaleDateString("vi-VN") : "-"}</td>
                  <td>{it.planEnd ? new Date(it.planEnd).toLocaleDateString("vi-VN") : "-"}</td>
                  <td>{it.actualStart ? new Date(it.actualStart).toLocaleDateString("vi-VN") : "-"}</td>
                  <td>{it.actualEnd ? new Date(it.actualEnd).toLocaleDateString("vi-VN") : "-"}</td>
                  <td>{daysBetween(it.planStart, it.planEnd) ?? "-"}</td>
                  <td>{statusLabel(it.status)}</td>
                  <td>{it.note ?? "-"}</td>
                  <td>
                    <button className="btn-line" onClick={() => { setEditing(it); setShowItemForm(true) }}>Sửa</button>
                    <button className="btn-line" onClick={() => onDeleteItem(it.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {active.items.length === 0 && <div className="empty">Chưa có đầu việc nào.</div>}
        </div>
      </div>
    </section>
  )
}
