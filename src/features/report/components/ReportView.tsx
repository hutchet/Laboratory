"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { StatusBadge } from "@/shared/ui/status-badge"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { EmptyState } from "@/shared/ui/empty-state"
import { KpiCard } from "@/shared/ui/kpi-card"
import { DirectionIcon } from "@/shared/ui/icons"
import { computeSimpleTrend } from "@/shared/lib/trend"
import { createReportProject, renameReportProject, deleteReportProject, saveReportRows } from "../actions"
import { REPORT_COLUMNS, emptyReportRow } from "../types"
import type { ReportProjectCard, ReportRowRecord, ReportRowData } from "../types"

export function ReportView({
  projects,
  rowsByProject,
}: {
  projects: ReportProjectCard[]
  rowsByProject: Record<string, ReportRowRecord[]>
}) {
  const [q, setQ] = useState("")
  const [pending, startTransition] = useTransition()

  const [showProjectForm, setShowProjectForm] = useState(false)
  const [editingProject, setEditingProject] = useState<ReportProjectCard | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [openProject, setOpenProject] = useState<ReportProjectCard | null>(null)
  const [rows, setRows] = useState<ReportRowData[]>([])
  const [isEditingRows, setIsEditingRows] = useState(false)

  const filtered = useMemo(
    () => projects.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())),
    [projects, q]
  )

  // Muc 3: bo sung khoi KPI + hub-card dung nguyen tac giong cac trang khac
  // (Quote hub, AuditPlan, Customers...) — tong quan + trend theo Project.createdAt.
  const overview = useMemo(() => {
    const withData = projects.filter((p) => p.rowCount > 0)
    const totalRows = projects.reduce((a, p) => a + p.rowCount, 0)
    const avgRows = projects.length ? totalRows / projects.length : 0
    return { total: projects.length, withData: withData.length, totalRows, avgRows }
  }, [projects])

  const reportTrends = useMemo(() => ({
    total: computeSimpleTrend(projects, () => true, (p) => p.createdAt),
    withData: computeSimpleTrend(projects, (p) => p.rowCount > 0, (p) => p.createdAt),
  }), [projects])

  function openNewProjectForm() { setEditingProject(null); setShowProjectForm(true) }
  function openRenameForm(p: ReportProjectCard) { setEditingProject(p); setShowProjectForm(true) }

  function handleSubmitProject() {
    const input = document.getElementById("tf-report-project-name") as HTMLInputElement | null
    const name = input?.value.trim() || ""
    if (!name) return
    startTransition(async () => {
      if (editingProject) await renameReportProject(editingProject.id, name)
      else await createReportProject(name)
      setShowProjectForm(false)
      setEditingProject(null)
    })
  }

  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => {
      await deleteReportProject(id)
      setConfirmDeleteId(null)
      if (openProject?.id === id) setOpenProject(null)
    })
  }

  function openSpreadsheet(p: ReportProjectCard) {
    setOpenProject(p)
    const existing = rowsByProject[p.id] || []
    setRows(existing.map((r) => ({ testName: r.testName, standard: r.standard, steps: r.steps, criteria: r.criteria, equipment: r.equipment, calibration: r.calibration })))
    setIsEditingRows(false)
  }

  function closeSpreadsheet() { setOpenProject(null); setIsEditingRows(false) }

  function addRow() { setRows((prev) => [...prev, emptyReportRow()]) }
  function removeRow(idx: number) { setRows((prev) => prev.filter((_, i) => i !== idx)) }
  function updateCell(idx: number, key: keyof ReportRowData, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)))
  }

  function handleSaveRows() {
    if (!openProject) return
    startTransition(async () => {
      await saveReportRows(openProject.id, rows)
      setIsEditingRows(false)
    })
  }

  function cancelEditRows() {
    const existing = rowsByProject[openProject?.id || ""] || []
    setRows(existing.map((r) => ({ testName: r.testName, standard: r.standard, steps: r.steps, criteria: r.criteria, equipment: r.equipment, calibration: r.calibration })))
    setIsEditingRows(false)
  }

  const displayRows = rows.filter((r) => REPORT_COLUMNS.some((c) => (r[c.key] || "").trim()))

  return (
    <PageShell
      title="Báo cáo thử nghiệm theo dự án"
      subtitle="Danh sách dự án được liên kết từ trang Dự án. Nhấn vào dự án để nhập bảng dự liệu báo cáo."
      actions={<button type="button" onClick={openNewProjectForm} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>+ Thêm dự án</button>}
      filters={<FilterBar search={{ value: q, onChange: setQ, placeholder: "Tìm dự án..." }} />}
    >
      <div className="kpis-tier" style={{ marginBottom: 16 }}>
        <KpiCard label="Tổng dự án" value={overview.total} tone="blue" trend={reportTrends.total} />
        <KpiCard label="Có dữ liệu" value={overview.withData} tone="success" trend={reportTrends.withData} />
        <KpiCard label="Tổng dòng dữ liệu" value={overview.totalRows} tone="blue" />
        <KpiCard label="TB dòng / dự án" value={overview.avgRows.toFixed(1)} tone="warning" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Chưa có dự án nào" />
      ) : (
        <div id="rp-project-cards" className="cu-grid">
          {filtered.map((p) => {
            const initial = p.name.trim().slice(0, 2).toUpperCase() || "DA"
            return (
              <div key={p.id} className="hub-card" onClick={() => openSpreadsheet(p)} style={{ cursor: "pointer" }}>
                <div className="hub-top">
                  <div className="hub-icon">{initial}</div>
                  <div className="hub-title"><h4>{p.name}</h4><p>{p.rowCount ? `${p.rowCount} dòng dữ liệu` : "Chưa có dữ liệu"}</p></div>
                  <span className="hub-arrow sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                </div>
                <div className="hub-tags">
                  <StatusBadge label={p.rowCount ? "Có dữ liệu" : "Chưa có dữ liệu"} tone={p.rowCount ? "success" : "neutral"} />
                </div>
                <div className="hub-stats">
                  <div className="hub-stat"><b>{p.rowCount}</b><span>Dòng dữ liệu</span></div>
                  <div className="hub-stat"><b>{REPORT_COLUMNS.length}</b><span>Cột báo cáo</span></div>
                </div>
                <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 8, borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}>
                  <button type="button" className="btn-line" style={{ flex: 1 }} onClick={() => openSpreadsheet(p)}>Xem chi tiết</button>
                  <button type="button" className="btn-line" onClick={() => openRenameForm(p)}>Sửa</button>
                  <button type="button" className="btn-line" onClick={() => setConfirmDeleteId(p.id)}>Xoá</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FormModal
        open={showProjectForm}
        title={editingProject ? "Sửa tên dự án" : "Thêm dự án"}
        onClose={() => { setShowProjectForm(false); setEditingProject(null) }}
        onSubmit={handleSubmitProject}
        submitting={pending}
      >
        <label key={editingProject?.id ?? "new"} style={{ fontSize: 12, fontWeight: 600 }}>Tên dự án *
          <input id="tf-report-project-name" required defaultValue={editingProject?.name ?? ""} placeholder="VD: VinFast" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--line, #dfe3e8)", background: "var(--card, #fff)", color: "var(--ink, #1c2337)", marginTop: 4 }} />
        </label>
      </FormModal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Xoá dự án này?"
        description="Dự án và toàn bộ bảng báo cáo thử nghiệm liên quan sẽ bị xoá vĩnh viễn."
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {openProject ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,18,22,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={closeSpreadsheet}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card, #fff)", color: "var(--ink, #1c2337)", borderRadius: 12, padding: 20, width: "min(96vw, 1100px)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Báo cáo thử nghiệm · {openProject.name}</div>
              <button type="button" className="modal-x" onClick={closeSpreadsheet} aria-label="Đóng">✕</button>
            </div>

            {!isEditingRows ? (
              <>
                <div style={{ overflowX: "auto", border: "1px solid var(--line, #e7eaee)", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--bg, #f7f8fa)", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px", width: 38 }}>#</th>
                        {REPORT_COLUMNS.map((c) => <th key={c.key} style={{ padding: "10px 12px", fontWeight: 600 }}>{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.length === 0 ? (
                        <tr><td style={{ padding: 14, color: "var(--muted, #8a8f98)" }}>—</td><td colSpan={REPORT_COLUMNS.length} style={{ padding: 14, color: "var(--muted, #8a8f98)" }}>Chưa có dữ liệu. Nhấn “Chỉnh sửa” để nhập.</td></tr>
                      ) : displayRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line, #f0f1f3)" }}>
                          <td style={{ padding: "10px 12px" }}>{i + 1}</td>
                          {REPORT_COLUMNS.map((c) => <td key={c.key} style={{ padding: "10px 12px", whiteSpace: "pre-wrap" }}>{r[c.key] || "—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={closeSpreadsheet} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line, #dfe3e8)", background: "var(--card, #fff)", color: "var(--ink, #1c2337)" }}>Đóng</button>
                  <button type="button" onClick={() => setIsEditingRows(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>Chỉnh sửa</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ overflowX: "auto", border: "1px solid var(--line, #e7eaee)", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "var(--bg, #f7f8fa)", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px", width: 38 }}>#</th>
                        {REPORT_COLUMNS.map((c) => <th key={c.key} style={{ padding: "10px 12px", fontWeight: 600 }}>{c.label}</th>)}
                        <th style={{ padding: "10px 12px", width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {(rows.length ? rows : [emptyReportRow()]).map((r, i) => (
                        <tr key={i}>
                          <td style={{ padding: "10px 12px" }}>{i + 1}</td>
                          {REPORT_COLUMNS.map((c) => (
                            <td key={c.key} style={{ padding: 6 }}>
                              <textarea
                                rows={3}
                                value={r[c.key] || ""}
                                onChange={(e) => updateCell(i, c.key, e.target.value)}
                                style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid var(--line, #dfe3e8)", background: "var(--card, #fff)", color: "var(--ink, #1c2337)", fontSize: 12.5, resize: "vertical" }}
                              />
                            </td>
                          ))}
                          <td style={{ padding: 6, textAlign: "center" }}>
                            <button type="button" onClick={() => removeRow(i)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer" }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
                  <button type="button" onClick={addRow} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line, #dfe3e8)", background: "var(--card, #fff)", color: "var(--ink, #1c2337)" }}>+ Thêm dòng</button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={cancelEditRows} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line, #dfe3e8)", background: "var(--card, #fff)", color: "var(--ink, #1c2337)" }}>Hủy</button>
                    <button type="button" disabled={pending} onClick={handleSaveRows} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff", opacity: pending ? 0.6 : 1 }}>{pending ? "Đang lưu..." : "Lưu báo cáo"}</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </PageShell>
  )
}

export default ReportView
