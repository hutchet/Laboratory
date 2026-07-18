"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import { saveProject, deleteProject } from "./actions"
import { useEscapeClose } from "@/lib/useEscapeClose"
import { CustomSelect } from "@/components/CustomSelect"

type ProjectRow = {
  id: string
  name: string
  value: number | null
  customerId: string | null
  centerId: string | null
  customerName: string | null
  centerName: string | null
  taskCount: number
  doneCount: number
  overdueCount: number
  displayStatus: "doing" | "done" | "risk"
  hasPlan: boolean
  planTestCount: number
  planStaffCount: number
}

type Option = { id: string; name: string }

const STATUS_LABEL: Record<string, string> = { doing: "Đang thực hiện", done: "Đã hoàn thành", risk: "Rủi ro" }
const PAGE_SIZE = 6

function fmtVnd(n: number | null) {
  if (!n) return "—"
  return n.toLocaleString("vi-VN") + " đ"
}

export default function ProjectsClient({ projects, customers, centers, canManage }: { projects: ProjectRow[]; customers: Option[]; centers: Option[]; canManage: boolean }) {
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ProjectRow | null>(null)
  useEscapeClose(showForm, () => { setShowForm(false); setEditing(null) })
  const [pending, startTransition] = useTransition()
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => projects.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase())), [projects, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page), totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paged = useMemo(() => filtered.slice(pageStart, pageStart + PAGE_SIZE), [filtered, pageStart])
  const showFrom = filtered.length ? pageStart + 1 : 0
  const showTo = Math.min(currentPage * PAGE_SIZE, filtered.length)

  function goToPage(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages))
  }

  const kpi = useMemo(() => {
    const active = projects.filter((p) => p.displayStatus !== "done").length
    const prog = projects.filter((p) => p.displayStatus === "doing").length
    const done = projects.filter((p) => p.displayStatus === "done").length
    const risk = projects.filter((p) => p.displayStatus === "risk").length
    return { active, prog, done, risk }
  }, [projects])

  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(p: ProjectRow) { setEditing(p); setShowForm(true) }
  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveProject(formData); setShowForm(false); setEditing(null) })
  }
  function onDelete(id: string) {
    if (!confirm("Xoá dự án này?")) return
    startTransition(async () => { await deleteProject(id) })
  }

  return (
    <section id="page-projects">
      <div className="grid kpis" style={{ marginBottom: 20 }}>
        <div className="kcard kb clickable" data-detail="pk-active"><div className="v" id="pk-active">{kpi.active}</div><div className="l">Dự án đang hoạt động</div></div>
        <div className="kcard kp clickable" data-detail="pk-prog"><div className="v" id="pk-prog">{kpi.prog}</div><div className="l">Đang thực hiện</div></div>
        <div className="kcard kg clickable" data-detail="pk-done"><div className="v" id="pk-done">{kpi.done}</div><div className="l">Đã hoàn thành</div></div>
        <div className="kcard kr clickable" data-detail="pk-risk"><div className="v" id="pk-risk">{kpi.risk}</div><div className="l">Dự án rủi ro</div></div>
      </div>
      <div className="section-head">
        <h3>Tất cả dự án</h3>
        <div className="tools">
          <div className="search" style={{ maxWidth: 260 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input id="psearch" placeholder="Tìm dự án..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
          </div>
          <button className="btn-line" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg> Bộ lọc</button>
          {canManage && (
          <button className="btn-pri" id="btn-newproj" onClick={openNew}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Dự án mới</button>
          )}
        </div>
      </div>
      {canManage && (
      <div className={showForm ? "card" : "card hidden"} id="proj-form" style={{ marginBottom: 18 }}>
        <form action={onSubmit}>
          <input type="hidden" id="pf-id" name="id" defaultValue={editing?.id ?? ""} />
          <div className="row">
            <div className="field" style={{ flex: 2, minWidth: 240 }}>
              <label>Tên dự án *</label>
              <input id="pf-name" name="name" placeholder="VD: VinFast" defaultValue={editing?.name ?? ""} key={`n-${editing?.id ?? "new"}`} required />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 200 }}>
              <label>Khách hàng</label>
              <CustomSelect id="pf-customer" name="customerId" defaultValue={editing?.customerId ?? ""} key={`c-${editing?.id ?? "new"}`} options={[{ value: "", label: "—" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 200 }}>
              <label>Trung tâm thử nghiệm</label>
              <CustomSelect id="pf-center" name="centerId" defaultValue={editing?.centerId ?? ""} key={`ce-${editing?.id ?? "new"}`} options={[{ value: "", label: "—" }, ...centers.map((c) => ({ value: c.id, label: c.name }))]} />
            </div>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>Trạng thái, ưu tiên, tiến độ và deadline được tự động tổng hợp từ các công việc có cùng tên dự án này.</p>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn-pri" id="pf-submit" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm dự án"}</button>
            <button type="button" className="btn-line" id="pf-cancel" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
          </div>
        </form>
      </div>
      )}
      <div className="proj-grid" id="proj-grid">
        {paged.map((p) => (
          <div className="pcard" key={p.id}>
            <div className="pt">
              <h4>{p.name}</h4>
              <div className="tags"><span className={`tag2 st-${p.displayStatus}`}>{STATUS_LABEL[p.displayStatus]}</span></div>
            </div>
            <div className="pbox">
              <div className="prow"><span>Khách hàng</span><b>{p.customerName ?? "—"}</b></div>
              <div className="prow"><span>Trung tâm</span><b>{p.centerName ?? "—"}</b></div>
              <div className="prow"><span>Công việc</span><b>{p.doneCount}/{p.taskCount}</b></div>
              <div className="prow"><span>Quá hạn</span><b>{p.overdueCount}</b></div>
              {p.hasPlan ? (
                <Link href={`/plan?project=${p.id}`} className="pplan-link" style={{ marginTop: 8, cursor: "pointer" }}>
                  <span>Kế hoạch thử nghiệm</span>
                  <span className="pplan-meta"><b>{p.planTestCount} bài · {p.planStaffCount} nhân viên</b><button type="button" className="sys-arrow-control pplan-arrow" aria-label="Mở kế hoạch">›</button></span>
                </Link>
              ) : (
                <div className="pplan-link is-empty" style={{ marginTop: 8 }}><span>Chưa có kế hoạch thử nghiệm</span></div>
              )}
            </div>
            <div className="pfoot">
              <span>{fmtVnd(p.value)}</span>
              {canManage && (
              <div className="pacts">
                <button className="btn-line" onClick={() => openEdit(p)}>Sửa</button>
                <button className="btn-line" onClick={() => onDelete(p.id)}>Xoá</button>
              </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty" id="proj-empty">Chưa có dự án nào.</div>}
      {filtered.length > 0 && (
        <div className="pager" id="proj-pager">
          <div className="info">Hiển thị {showFrom}-{showTo} / {filtered.length} dự án</div>
          <div className="pages">
            <button type="button" className="pg" data-pg="prev" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className={`pg ${n === currentPage ? "active" : ""}`} data-pg={n} onClick={() => goToPage(n)}>{n}</button>
            ))}
            <button type="button" className="pg" data-pg="next" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>›</button>
          </div>
        </div>
      )}
    </section>
  )
}
