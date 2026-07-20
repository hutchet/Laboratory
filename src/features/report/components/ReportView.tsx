"use client"
import { useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { FilterBar } from "@/shared/ui/filter-bar"
import { StatusBadge } from "@/shared/ui/status-badge"
import { FormModal } from "@/shared/ui/form-modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { EmptyState } from "@/shared/ui/empty-state"
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
      {filtered.length === 0 ? (
        <EmptyState title="Chưa có dự án nào" />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ border: "1px solid #e2e5e9", borderRadius: 12, padding: 14, cursor: "pointer" }} onClick={() => openSpreadsheet(p)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{p.name}</h4>
                <span style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => openRenameForm(p)} style={{ border: "none", background: "none", color: "#1d5fd6", cursor: "pointer", fontSize: 12 }}>Sửa</button>
                  <button type="button" onClick={() => setConfirmDeleteId(p.id)} style={{ border: "none", background: "none", color: "#c62828", cursor: "pointer", fontSize: 12 }}>Xoá</button>
                </span>
              </div>
              <div style={{ marginTop: 10 }}>
                <StatusBadge label={p.rowCount ? `${p.rowCount} dòng dữ liệu` : "Chưa có dữ liệu"} tone={p.rowCount ? "success" : "neutral"} />
                <div style={{ fontSize: 11.5, opacity: 0.6, marginTop: 8 }}>Nhấn để mở bảng nhập báo cáo thử nghiệm</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal
        open={showProjectForm}
        title={editingProject ? "Sửa tên dự án" : "Thêm dự án"}
        onClose={() => { setShowProjectForm(false); setEditingProject(null) }}
        onSubmit={handleSubmitProject}
        submitting={pending}
      >
        <label style={{ fontSize: 12, fontWeight: 600 }}>Tên dự án *
          <input id="tf-report-project-name" required defaultValue={editingProject?.name ?? ""} placeholder="VD: VinFast" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #dfe3e8", marginTop: 4 }} />
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
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 20, width: "min(96vw, 1100px)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Báo cáo thử nghiệm · {openProject.name}</div>
              <button type="button" className="modal-x" onClick={closeSpreadsheet} aria-label="Đóng">✕</button>
            </div>

            {!isEditingRows ? (
              <>
                <div style={{ overflowX: "auto", border: "1px solid #e7eaee", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f7f8fa", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px", width: 38 }}>#</th>
                        {REPORT_COLUMNS.map((c) => <th key={c.key} style={{ padding: "10px 12px", fontWeight: 600 }}>{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.length === 0 ? (
                        <tr><td style={{ padding: 14, color: "#8a8f98" }}>—</td><td colSpan={REPORT_COLUMNS.length} style={{ padding: 14, color: "#8a8f98" }}>Chưa có dữ liệu. Nhấn “Chỉnh sửa” để nhập.</td></tr>
                      ) : displayRows.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #f0f1f3" }}>
                          <td style={{ padding: "10px 12px" }}>{i + 1}</td>
                          {REPORT_COLUMNS.map((c) => <td key={c.key} style={{ padding: "10px 12px", whiteSpace: "pre-wrap" }}>{r[c.key] || "—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                  <button type="button" onClick={closeSpreadsheet} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff" }}>Đóng</button>
                  <button type="button" onClick={() => setIsEditingRows(true)} style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: "#1d5fd6", color: "#fff" }}>Chỉnh sửa</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ overflowX: "auto", border: "1px solid #e7eaee", borderRadius: 10 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f7f8fa", textAlign: "left" }}>
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
                                style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #dfe3e8", fontSize: 12.5, resize: "vertical" }}
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
                  <button type="button" onClick={addRow} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff" }}>+ Thêm dòng</button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={cancelEditRows} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #dfe3e8", background: "#fff" }}>Hủy</button>
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
