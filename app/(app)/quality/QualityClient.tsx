"use client"

import { useMemo, useState, useTransition } from "react"
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem } from "./actions"
import { CustomSelect } from "@/components/CustomSelect"

type Checklist = { id: string; name: string; done: boolean; dueDate: string | null }
type Calibration = { id: string; name: string; code: string | null; calLast: string | null; calInterval: number | null; calVendor: string | null; calCert: string | null; dueLabel: string; dueDate: string }
type AuditEntry = { id: string; entity: string | null; actor: string | null; role: string | null; area: string | null; action: string | null; note: string | null; createdAt: string }

const ISO_CRITERIA = [
  "4. Yêu cầu chung: Tính khách quan, bảo mật",
  "5. Yêu cầu về cơ cấu: Trách nhiệm pháp lý, cơ cấu tổ chức",
  "6. Yêu cầu về nguồn lực: Nhân sự, cơ sở vật chất, thiết bị, hiệu chuẩn",
  "7. Yêu cầu về quá trình: Xem xét yêu cầu, phương pháp thử, mẫu, hồ sơ kỹ thuật, báo cáo kết quả",
  "8. Yêu cầu hệ thống quản lý: Kiểm soát tài liệu, hồ sơ, hành động khắc phục, đánh giá nội bộ",
]

export default function QualityClient({ checklist, calibration, auditEntries }: { checklist: Checklist[]; calibration: Calibration[]; auditEntries: AuditEntry[] }) {
  const [entityFilter, setEntityFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [pending, startTransition] = useTransition()

  const overdue = calibration.filter((c) => c.dueLabel === "overdue").length
  const soon = calibration.filter((c) => c.dueLabel === "soon").length
  const ok = calibration.filter((c) => c.dueLabel === "ok").length

  const entities = useMemo(() => Array.from(new Set(auditEntries.map((a) => a.entity).filter(Boolean))) as string[], [auditEntries])

  const shownEntries = useMemo(() => {
    let list = entityFilter === "all" ? auditEntries : auditEntries.filter((a) => a.entity === entityFilter)
    if (search) list = list.filter((a) => [a.action, a.note, a.actor].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase()))
    return list
  }, [auditEntries, entityFilter, search])

  const calibrationSorted = useMemo(() => {
    const order: Record<string, number> = { overdue: 0, soon: 1, ok: 2 }
    return [...calibration].sort((a, b) => (order[a.dueLabel] ?? 3) - (order[b.dueLabel] ?? 3))
  }, [calibration])

  function onToggle(id: string, done: boolean) {
    startTransition(async () => { await toggleChecklistItem(id, !done) })
  }
  function onDelete(id: string) {
    startTransition(async () => { await deleteChecklistItem(id) })
  }
  function onAddChecklist(formData: FormData) {
    startTransition(async () => { await addChecklistItem(formData) })
  }

  return (
    <section id="page-quality">
      <div className="grid kpis" style={{ marginBottom: 18 }}>
        <div className="kcard kr"><div className="v" id="ql-k-overdue">{overdue}</div><div className="l">Thiết bị quá hạn hiệu chuẩn</div><div className="s">Cần xử lý ngay</div></div>
        <div className="kcard kp"><div className="v" id="ql-k-soon">{soon}</div><div className="l">Sắp đến hạn (≤30 ngày)</div><div className="s">Cần lên lịch tái hiệu chuẩn</div></div>
        <div className="kcard kg"><div className="v" id="ql-k-ok">{ok}</div><div className="l">Còn hạn</div><div className="s">Đang tuân thủ</div></div>
        <div className="kcard kb"><div className="v" id="ql-k-audit">{auditEntries.length}</div><div className="l">Số bản ghi Audit trail</div><div className="s">Toàn bộ lịch sử thao tác</div></div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="ch"><h3>Tiêu chí kiểm soát theo ISO/IEC 17025:2017</h3><span>Phòng thử nghiệm được quản lý theo các điều khoản của tiêu chuẩn — không phải tiêu chí nội bộ của phần mềm này</span></div>
        <div id="ql-checklist" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ISO_CRITERIA.map((c) => (<div key={c} style={{ fontSize: 13, color: "var(--muted)" }}>• {c}</div>))}
          <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8 }}>
            {checklist.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input type="checkbox" checked={c.done} onChange={() => onToggle(c.id, c.done)} />
                <span style={{ textDecoration: c.done ? "line-through" : "none", flex: 1 }}>{c.name}</span>
                {c.dueDate && <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(c.dueDate).toLocaleDateString("vi-VN")}</span>}
                <button className="btn-line" onClick={() => onDelete(c.id)}>Xóa</button>
              </div>
            ))}
          </div>
          <form action={onAddChecklist} style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input name="name" placeholder="Thêm hạng mục kiểm soát nội bộ..." style={{ flex: 1 }} required />
            <input type="date" name="dueDate" />
            <button type="submit" className="btn-pri" disabled={pending}>+ Thêm</button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, padding: 0, overflowX: "auto" }}>
        <div className="ch" style={{ padding: "16px 18px 0" }}><h3>Lịch tái hiệu chuẩn thiết bị</h3><span>Sắp xếp theo mức độ khẩn cấp</span></div>
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Thiết bị</th><th>Mã</th><th>Hiệu chuẩn gần nhất</th><th>Chu kỳ (tháng)</th><th>Hạn tái hiệu chuẩn</th><th>Trạng thái</th></tr></thead>
          <tbody id="ql-cal-body">
            {calibrationSorted.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.code ?? "-"}</td>
                <td>{c.calLast ? new Date(c.calLast).toLocaleDateString("vi-VN") : "-"}</td>
                <td>{c.calInterval ?? "-"}</td>
                <td>{new Date(c.dueDate).toLocaleDateString("vi-VN")}</td>
                <td>{c.dueLabel === "overdue" ? "Quá hạn" : c.dueLabel === "soon" ? "Sắp tới" : "Còn hạn"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {calibrationSorted.length === 0 && <div className="empty" id="ql-cal-empty">Chưa có thiết bị nào khai báo thông tin hiệu chuẩn.</div>}
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div className="ch ch-toolbar" style={{ padding: "16px 18px 0" }}>
          <div><h3>Nhật ký thao tác (Audit trail)</h3><span>Ghi nhận ai đã làm gì, vào lúc nào</span></div>
          <div style={{ display: "flex", gap: 8 }}>
            <CustomSelect id="ql-filter-entity" className="sys-cs-inline" value={entityFilter} onChange={(v) => setEntityFilter(v)} options={[{ value: "all", label: "Tất cả khu vực" }, ...entities.map((e) => ({ value: e, label: e }))]} />
            <input id="ql-search" placeholder="Tìm theo nội dung..." style={{ width: 200, maxWidth: "100%" }} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <table style={{ marginTop: 12 }}>
          <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Vai trò</th><th>Khu vực</th><th>Hành động</th><th>Chi tiết</th></tr></thead>
          <tbody id="ql-audit-body">
            {shownEntries.map((a) => (
              <tr key={a.id}>
                <td>{new Date(a.createdAt).toLocaleString("vi-VN")}</td>
                <td>{a.actor ?? "-"}</td>
                <td>{a.role ?? "-"}</td>
                <td>{a.area ?? "-"}</td>
                <td>{a.action ?? "-"}</td>
                <td>{a.note ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {shownEntries.length === 0 && <div className="empty" id="ql-audit-empty">Chưa có nhật ký nào.</div>}
      </div>
    </section>
  )
}
