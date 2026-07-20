"use client"

// Modal chi tiet khi bam vao the/card tren Tong quan - port lai tinh than cua
// openDetail(type) ban goc (dong ~7475-7526): mo overlay hien thi so lieu tom
// tat + bang danh sach lien quan. Dung lai nguyen CSS .modal-overlay/.modal/
// .modal-h/.modal-x/.modal-body da co san trong globals.css. Ho tro 3 dang
// dong du lieu (task/project/member) tuy theo detailType - xem compute.ts.
import { fmtDateVN, type DashboardDetail, type DashboardDetailRow } from "../compute"

function DetailTable({ rows }: { rows: DashboardDetailRow[] }) {
  if (rows.length === 0) {
    return <div className="empty" style={{ padding: "8px 0" }}>Không có dữ liệu.</div>
  }
  const kind = rows[0].kind

  if (kind === "project") {
    return (
      <table>
        <thead>
          <tr>
            <th>Dự án</th>
            <th>Trạng thái</th>
            <th>Ưu tiên</th>
            <th>Tiến độ</th>
            <th>Hạn chốt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            if (r.kind !== "project") return null
            return (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td>{r.status}</td>
                <td>{r.priority}</td>
                <td>{r.progressLabel}</td>
                <td>{fmtDateVN(r.deadline)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  if (kind === "member") {
    return (
      <table>
        <thead>
          <tr>
            <th>Thành viên</th>
            <th>Đang làm</th>
            <th>Quá hạn</th>
            <th>Hoàn thành</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            if (r.kind !== "member") return null
            return (
              <tr key={r.id}>
                <td><b>{r.name}</b></td>
                <td>{r.active}</td>
                <td>{r.overdue > 0 ? <span className="pill" style={{ color: "var(--red)", background: "var(--red-soft)" }}>{r.overdue}</span> : r.overdue}</td>
                <td>{r.done}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }

  const statusStyle = (s: string) => {
    if (s === "Hoàn thành") return { color: "var(--green, #16a34a)", background: "var(--green-soft, #dcfce7)" }
    if (s === "Quá hạn") return { color: "var(--red, #dc2626)", background: "var(--red-soft, #fee2e2)" }
    return { color: "var(--pri, #2563eb)", background: "var(--pri-soft, #dbeafe)" }
  }
  return (
    <table>
      <thead>
        <tr>
          <th>Công việc</th>
          <th>Dự án</th>
          <th>Phụ trách</th>
          <th>Hạn chốt</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          if (r.kind !== "task") return null
          return (
            <tr key={r.id}>
              <td><b>{r.title}</b></td>
              <td>{r.project}</td>
              <td>{r.assigneeName}</td>
              <td>{fmtDateVN(r.deadline)}</td>
              <td>
                <span className="pill" style={{ ...statusStyle(r.status), padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {r.status}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function DashboardDetailModal({ detail, onClose }: { detail: DashboardDetail | null; onClose: () => void }) {
  if (!detail) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>{detail.title}</h3>
          <button type="button" className="modal-x" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {detail.note && (
            <p className="md-sub" style={{ marginTop: 0, marginBottom: 16 }}>{detail.note}</p>
          )}
          {detail.stats.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {detail.stats.map((s) => (
                <div key={s.label} className="note" style={{ flex: "1 1 120px", textAlign: "center", padding: "10px 8px" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)" }}>{s.value}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
          {detail.sections.map((sec, i) => (
            <div key={i}>
              {sec.heading ? (
                <h4 className="md-h">
                  {sec.color ? <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: sec.color, marginRight: 7, verticalAlign: "middle" }} /> : null}
                  {sec.heading} ({sec.rows.length})
                </h4>
              ) : null}
              <DetailTable rows={sec.rows} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
