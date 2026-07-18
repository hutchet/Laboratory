"use client"

import { useMemo, useState, useTransition } from "react"
import { saveReport, deleteReport } from "./actions"
import { useEscapeClose } from "@/lib/useEscapeClose"

type ReportRow = { id: string; title: string; content: string | null; projectId: string | null; projectName: string | null; createdAt: string }
type Option = { id: string; name: string }

export default function ReportClient({ reports, projects }: { reports: ReportRow[]; projects: Option[] }) {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ReportRow | null>(null)
  useEscapeClose(showForm, () => { setShowForm(false); setEditing(null) })
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => reports.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase())), [reports, q])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(r: ReportRow) { setEditing(r); setShowForm(true) }
  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveReport(formData); setShowForm(false); setEditing(null) })
  }
  function onDelete(id: string) {
    if (!confirm("Xoá dự án báo cáo này?")) return
    startTransition(async () => { await deleteReport(id) })
  }

  return (
    <section id="page-report">
      <div className="section-head">
        <h3>Báo cáo thử nghiệm theo dự án</h3>
        <div className="tools">
          <div className="search" style={{ maxWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input id="rsearch" placeholder="Tìm dự án..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-pri" id="btn-newrproj" onClick={openNew}>+ Thêm dự án</button>
        </div>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, margin: "-4px 0 16px" }}>Danh sách dự án được liên kết từ trang Projects. Bạn có thể thêm / sửa / xoá tại đây, rồi nhấn vào dự án để nhập bảng dữ liệu báo cáo.</p>
      <div className={showForm ? "card" : "card hidden"} id="report-form" style={{ marginBottom: 18 }}>
        <form action={onSubmit}>
          <input type="hidden" id="rf-id" name="id" defaultValue={editing?.id ?? ""} />
          <div className="row"><div className="field" style={{ flex: 2, minWidth: 240 }}><label>Tên dự án *</label><input id="rf-name" name="title" placeholder="VD: VinFast" defaultValue={editing?.title ?? ""} key={`t-${editing?.id ?? "new"}`} required /></div></div>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn-pri" id="rf-submit" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm dự án"}</button>
            <button type="button" className="btn-line" id="rf-cancel" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
          </div>
        </form>
      </div>
      <div className="proj-grid" id="report-grid">
        {filtered.map((r) => (
          <div className="pcard" key={r.id}>
            <div className="pt"><h4>{r.title}</h4></div>
            <div className="pbox">
              <div className="prow"><span>Dự án gốc</span><b>{r.projectName ?? "—"}</b></div>
              <div className="prow"><span>Ngày tạo</span><b>{r.createdAt.slice(0, 10)}</b></div>
            </div>
            <div className="pfoot">
              <span>{r.content ? r.content.slice(0, 40) : "Chưa có nội dung"}</span>
              <div className="pacts">
                <button className="btn-line" onClick={() => openEdit(r)}>Sửa</button>
                <button className="btn-line" onClick={() => onDelete(r.id)}>Xoá</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty" id="report-empty">Chưa có dự án nào.</div>}
    </section>
  )
}
