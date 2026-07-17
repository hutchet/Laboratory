"use client"

import { useMemo, useState, useTransition } from "react"
import { saveSample, deleteSample } from "./actions"

type Row = {
  id: string; code: string | null; name: string; serialNumber: string | null
  customerId: string | null; customerName: string | null; projectId: string | null; projectName: string | null
  sampleGrade: string | null; group: string | null; status: string | null; receivedAt: string | null
}
type Option = { id: string; name: string }

const STATUS_LABEL: Record<string, string> = { received: "Mới nhận", testing: "Đang thử nghiệm", done: "Hoàn thành" }

export default function SamplesClient({ samples, customers, projects }: { samples: Row[]; customers: Option[]; projects: Option[] }) {
  const [status, setStatus] = useState("all")
  const [customerId, setCustomerId] = useState("")
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const total = samples.length
  const testing = samples.filter((s) => s.status === "testing").length
  const done = samples.filter((s) => s.status === "done").length
  const received = samples.filter((s) => s.status === "received").length

  const filtered = useMemo(() => samples.filter((s) => {
    if (status !== "all" && s.status !== status) return false
    if (customerId && s.customerId !== customerId) return false
    if (q) {
      const needle = q.toLowerCase()
      const haystack = [s.code, s.serialNumber, s.name, s.projectName].filter(Boolean).join(" ").toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  }), [samples, status, customerId, q])

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveSample(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xóa mẫu này?")) return
    startTransition(async () => { await deleteSample(id) })
  }

  return (
    <section id="page-samples">
      <div className="grid kpis" style={{ marginBottom: 18 }}>
        <div className="kcard kb"><div className="v" id="sm-k-total">{total}</div><div className="l">Tổng số mẫu</div><div className="s">Toàn bộ hệ thống</div></div>
        <div className="kcard kp"><div className="v" id="sm-k-testing">{testing}</div><div className="l">Đang thử nghiệm</div><div className="s">Mẫu đang xử lý</div></div>
        <div className="kcard kg"><div className="v" id="sm-k-done">{done}</div><div className="l">Hoàn thành</div><div className="s">Đã trả/xử lý xong</div></div>
        <div className="kcard kr"><div className="v" id="sm-k-received">{received}</div><div className="l">Mới nhận, chưa xếp lịch</div><div className="s">Cần lập kế hoạch</div></div>
      </div>

      <div className="toolbar">
        <div className="chips" id="sm-status-chips">
          {["all", "received", "testing", "done"].map((c) => (
            <button key={c} className={status === c ? "chip active" : "chip"} onClick={() => setStatus(c)}>
              {c === "all" ? "Tất cả" : STATUS_LABEL[c]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select id="sm-filter-customer" style={{ minWidth: 180 }} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Tất cả khách hàng</option>
            {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <input id="sm-search" placeholder="Tìm mã mẫu, S/N, dự án..." style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="row" style={{ margin: "10px 0" }}>
        <button className="btn-pri" onClick={() => { setEditing(null); setShowForm(true) }}>+ Mẫu mới</button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Mã mẫu</label><input name="code" defaultValue={editing?.code ?? ""} /></div>
              <div className="field"><label>Số S/N</label><input name="serialNumber" defaultValue={editing?.serialNumber ?? ""} /></div>
              <div className="field"><label>Tên mẫu</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
            </div>
            <div className="row">
              <div className="field">
                <label>Khách hàng</label>
                <select name="customerId" defaultValue={editing?.customerId ?? ""}>
                  <option value="">-- Không --</option>
                  {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div className="field">
                <label>Dự án</label>
                <select name="projectId" defaultValue={editing?.projectId ?? ""}>
                  <option value="">-- Không --</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field"><label>Cấp độ mẫu</label><input name="sampleGrade" defaultValue={editing?.sampleGrade ?? ""} /></div>
              <div className="field"><label>Nhóm mẫu</label><input name="group" defaultValue={editing?.group ?? ""} /></div>
              <div className="field">
                <label>Trạng thái</label>
                <select name="status" defaultValue={editing?.status ?? "received"}>
                  <option value="received">Mới nhận</option>
                  <option value="testing">Đang thử nghiệm</option>
                  <option value="done">Hoàn thành</option>
                </select>
              </div>
            </div>
            <div className="row">
              <div className="field"><label>Ngày nhận</label><input type="date" name="receivedAt" defaultValue={editing?.receivedAt ? editing.receivedAt.slice(0, 10) : ""} /></div>
            </div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Lưu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div id="sm-body">
        <table>
          <thead><tr><th>Mã mẫu</th><th>S/N</th><th>Tên mẫu</th><th>Khách hàng</th><th>Dự án</th><th>Cấp độ</th><th>Nhóm</th><th>Trạng thái</th><th>Ngày nhận</th><th>Thao tác</th></tr></thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td>{s.code ?? "-"}</td>
                <td>{s.serialNumber ?? "-"}</td>
                <td>{s.name}</td>
                <td>{s.customerName ?? "-"}</td>
                <td>{s.projectName ?? "-"}</td>
                <td>{s.sampleGrade ?? "-"}</td>
                <td>{s.group ?? "-"}</td>
                <td>{STATUS_LABEL[s.status ?? "received"]}</td>
                <td>{s.receivedAt ? s.receivedAt.slice(0, 10) : "-"}</td>
                <td>
                  <button className="btn-line" onClick={() => { setEditing(s); setShowForm(true) }}>Sửa</button>
                  <button className="btn-line" onClick={() => onDelete(s.id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <div className="empty" id="sm-empty">Chưa có mẫu nào được đăng ký.</div>}
    </section>
  )
}
