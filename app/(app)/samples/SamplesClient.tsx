"use client"

import { useMemo, useState, useTransition } from "react"
import { addSampleForProject, updateSampleTracking, deleteSample } from "./actions"
import { useEscapeClose } from "@/lib/useEscapeClose"
import { CustomSelect } from "@/components/CustomSelect"

type Row = {
  id: string; code: string | null; serialNumber: string | null; qty: number
  storageLocation: string | null
  customerId: string | null; customerName: string | null; projectId: string | null; projectName: string | null
  status: string | null; receivedAt: string | null
  testTotal: number; testDone: number; testClosed: number; testStarted: number
}
type Option = { id: string; name: string }

const SAMPLE_STATUS = ["received", "testing", "completed", "returned"]
const STATUS_LABEL: Record<string, string> = { received: "Mới nhận", testing: "Đang thử nghiệm", completed: "Hoàn thành", returned: "Đã trả/hủy" }
const STATUS_COLOR: Record<string, string> = { received: "#9aa1ab", testing: "#4f6cf7", completed: "#27ae84", returned: "#c7cbd3" }

function autoStatus(s: Row): string {
  if (s.status) return s.status
  if (s.testTotal === 0) return "received"
  if (s.testClosed === s.testTotal) return "completed"
  return s.testStarted > 0 ? "testing" : "received"
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function SamplesClient({ samples, customers, projects }: { samples: Row[]; customers: Option[]; projects: Option[] }) {
  const [statusFilter, setStatusFilter] = useState("all")
  const [customerId, setCustomerId] = useState("")
  const [q, setQ] = useState("")
  const [addingProjectId, setAddingProjectId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Row | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  useEscapeClose(!!editing, () => setEditing(null))
  useEscapeClose(!!addingProjectId, () => setAddingProjectId(null))
  const [pending, startTransition] = useTransition()

  const withStatus = useMemo(() => samples.map((s) => ({ s, status: autoStatus(s) })), [samples])

  const total = withStatus.length
  const testing = withStatus.filter((x) => x.status === "testing").length
  const done = withStatus.filter((x) => x.status === "completed" || x.status === "returned").length
  const received = withStatus.filter((x) => x.status === "received").length

  const filtered = useMemo(() => withStatus.filter(({ s, status }) => {
    if (statusFilter !== "all" && status !== statusFilter) return false
    if (customerId && s.customerId !== customerId) return false
    if (q) {
      const needle = q.toLowerCase()
      const haystack = [s.code, s.serialNumber, s.projectName].filter(Boolean).join(" ").toLowerCase()
      if (!haystack.includes(needle)) return false
    }
    return true
  }), [withStatus, statusFilter, customerId, q])

  const groups = useMemo(() => {
    const map = new Map<string, { projectId: string | null; projectName: string; customerName: string | null; items: Array<{ s: Row; status: string }> }>()
    filtered.forEach((x) => {
      const key = x.s.projectId ?? "__none__"
      if (!map.has(key)) {
        map.set(key, {
          projectId: x.s.projectId,
          projectName: x.s.projectName ?? "Không thuộc dự án nào",
          customerName: x.s.customerName,
          items: [],
        })
      }
      map.get(key)!.items.push(x)
    })
    return Array.from(map.values()).sort((a, b) => a.projectName.localeCompare(b.projectName))
  }, [filtered])

  function onAddSubmit(formData: FormData) {
    startTransition(async () => {
      await addSampleForProject(formData)
      setAddingProjectId(null)
    })
  }

  function onEditSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await updateSampleTracking(formData)
      setEditing(null)
    })
  }

  function onDelete(s: Row) {
    const msg = s.testTotal ? `Mẫu này có ${s.testTotal} bài test liên quan. Xóa sẽ xóa luôn các bài test đó. Tiếp tục?` : "Xóa mẫu này?"
    if (!confirm(msg)) return
    startTransition(async () => { await deleteSample(s.id) })
  }

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
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
          {["all", ...SAMPLE_STATUS].map((c) => (
            <button key={c} className={statusFilter === c ? "chip active" : "chip"} onClick={() => setStatusFilter(c)}>
              {c === "all" ? "Tất cả" : STATUS_LABEL[c]}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <CustomSelect id="sm-filter-customer" value={customerId} onChange={(v) => setCustomerId(v)} options={[{ value: "", label: "Tất cả khách hàng" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} />
          <input id="sm-search" placeholder="Tìm mã mẫu, S/N, dự án..." style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div id="sm-body">
        {groups.map((g, gi) => {
          const key = g.projectId ?? "__none__"
          const gid = `smg-${gi}`
          const isCollapsed = collapsed.has(key)
          const totalItems = g.items.reduce((s, x) => s + x.s.testTotal, 0)
          const totalDone = g.items.reduce((s, x) => s + x.s.testDone, 0)
          const pct = totalItems ? Math.round((totalDone / totalItems) * 100) : 0
          return (
            <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }} key={key}>
              <div className="ch sm-card-head" style={{ padding: "14px 18px", cursor: "pointer", alignItems: "center" }} onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; toggleGroup(key) }}>
                <div>
                  <h3 style={{ fontSize: 15 }}>{g.projectName}</h3>
                  <span>{g.customerName ? `Khách hàng: ${g.customerName} · ` : ""}{g.items.length} mẫu</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ textAlign: "right" }}><div style={{ fontSize: 12, color: "var(--muted)" }}>Tiến độ</div><div style={{ fontWeight: 600, fontSize: 16 }}>{pct}%</div></div>
                  <div className="pbar" style={{ width: 90 }}><i style={{ width: `${pct}%` }} /></div>
                  {g.projectId && (
                    <button type="button" className="btn-line" data-sm-add-proj={g.projectId} style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setAddingProjectId(g.projectId)}>+ Thêm mẫu</button>
                  )}
                  <span className="sm-chevron" style={{ transition: "transform .15s", transform: isCollapsed ? "rotate(-90deg)" : undefined }}>▾</span>
                </div>
              </div>
              {g.projectId && addingProjectId === g.projectId && (
                <div className="card" style={{ margin: "0 18px 14px" }}>
                  <form action={onAddSubmit}>
                    <input type="hidden" name="projectId" value={g.projectId} />
                    <div className="row">
                      <div className="field"><label>Mã mẫu *</label><input name="code" required /></div>
                      <div className="field"><label>Số seri (S/N)</label><input name="serialNumber" /></div>
                      <div className="field"><label>Số lượng</label><input name="qty" type="number" min={1} defaultValue={1} /></div>
                    </div>
                    <div className="row">
                      <div className="field"><label>Ngày nhận mẫu</label><input type="date" name="receivedAt" defaultValue={todayStr()} /></div>
                      <div className="field"><label>Vị trí lưu trữ</label><input name="storageLocation" placeholder="VĐ: Tủ A - Kệ 2" /></div>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Mẫu mới chưa có bài test sẽ hiển thị trạng thái “Mới nhận” cho đến khi lập kế hoạch thử nghiệm.</div>
                    <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
                      <button type="button" className="btn-line" onClick={() => setAddingProjectId(null)}>Hủy</button>
                      <button type="submit" className="btn-pri" disabled={pending}>Lưu mẫu</button>
                    </div>
                  </form>
                </div>
              )}
              {!isCollapsed && (
                <div className="sm-card-body" id={gid} style={{ overflowX: "auto" }}>
                  <table style={{ marginTop: 0 }}>
                    <thead><tr><th>Mã mẫu</th><th>Số seri</th><th>Số lượng</th><th>Ngày nhận</th><th>Vị trí lưu trữ</th><th>Tiến độ</th><th>Trạng thái mẫu</th><th>Thao tác</th></tr></thead>
                    <tbody>
                      {g.items.map(({ s, status }) => (
                        editing?.id === s.id ? (
                          <tr key={s.id}>
                            <td colSpan={8}>
                              <form action={onEditSubmit} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "6px 0" }}>
                                <div className="field" style={{ margin: 0 }}><label>Ngày nhận mẫu</label><input type="date" name="receivedAt" defaultValue={s.receivedAt ? s.receivedAt.slice(0, 10) : ""} /></div>
                                <div className="field" style={{ margin: 0 }}><label>Vị trí lưu trữ</label><input name="storageLocation" defaultValue={s.storageLocation ?? ""} placeholder="VĐ: Tủ A - Kệ 2" /></div>
                                <div className="field" style={{ margin: 0 }}>
                                  <label>Trạng thái mẫu</label>
                                  <CustomSelect name="status" defaultValue={s.status ?? ""} options={[{ value: "", label: "— Tự động —" }, ...SAMPLE_STATUS.map((st) => ({ value: st, label: STATUS_LABEL[st] }))]} />
                                </div>
                                <button type="button" className="btn-line" onClick={() => setEditing(null)}>Hủy</button>
                                <button type="submit" className="btn-pri" disabled={pending}>Lưu</button>
                              </form>
                            </td>
                          </tr>
                        ) : (
                          <tr key={s.id}>
                            <td><b>{s.code ?? "-"}</b></td>
                            <td>{s.serialNumber ?? "—"}</td>
                            <td>{s.qty || 1}</td>
                            <td>{s.receivedAt ? s.receivedAt.slice(0, 10) : "—"}</td>
                            <td>{s.storageLocation ?? "—"}</td>
                            <td>{s.testDone}/{s.testTotal} đạt</td>
                            <td><span className="pill" style={{ color: "#fff", background: STATUS_COLOR[status] }}>{STATUS_LABEL[status]}</span></td>
                            <td>
                              <div className="acts">
                                <button className="txt-act pri" onClick={() => setEditing(s)}>Sửa</button>
                                <button className="txt-act del" onClick={() => onDelete(s)}>Xóa</button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {groups.length === 0 && <div className="empty" id="sm-empty">Chưa có mẫu nào được đăng ký.</div>}
    </section>
  )
}
