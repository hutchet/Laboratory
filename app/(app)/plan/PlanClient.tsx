"use client"

import { useEffect, useState, useTransition } from "react"
import { createPlan, deletePlan, addSample, saveItem, deleteItem } from "./actions"

type Item = {
  id: string; sampleId: string | null; sampleName: string | null; reportCode: string | null
  equipmentId: string | null; equipmentName: string | null
  name: string; priority: string | null; standard: string | null
  assignee: string | null; planStart: string | null; planEnd: string | null; actualStart: string | null; actualEnd: string | null
  result: string | null; progress: number | null; note: string | null
}
type Plan = { id: string; title: string | null; projectId: string; projectName: string; items: Item[] }
type Option = { id: string; name: string }

const RESULT_LABEL: Record<string, string> = { pending: "Đang chạy", pass: "Đạt", fail: "Không đạt" }
const PRIORITY_LABEL: Record<string, string> = { high: "Cao", med: "Trung bình", low: "Thấp" }

function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  const ms = new Date(b).getTime() - new Date(a).getTime()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.round(ms / 86400000))
}

function Donut({ pass, fail, ongoing }: { pass: number; fail: number; ongoing: number }) {
  const total = pass + fail + ongoing
  const r = 15.9155
  const circ = 2 * Math.PI * r
  const passLen = total ? (pass / total) * circ : 0
  const failLen = total ? (fail / total) * circ : 0
  const ongoingLen = total ? (ongoing / total) * circ : 0
  return (
    <svg width="120" height="120" viewBox="0 0 42 42">
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--line)" strokeWidth="5" />
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--green)" strokeWidth="5"
        strokeDasharray={`${passLen} ${circ - passLen}`} strokeDashoffset="25" transform="rotate(-90 21 21)" />
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--red)" strokeWidth="5"
        strokeDasharray={`${failLen} ${circ - failLen}`} strokeDashoffset={25 - passLen} transform="rotate(-90 21 21)" />
      <circle cx="21" cy="21" r={r} fill="transparent" stroke="var(--pri)" strokeWidth="5"
        strokeDasharray={`${ongoingLen} ${circ - ongoingLen}`} strokeDashoffset={25 - passLen - failLen} transform="rotate(-90 21 21)" />
    </svg>
  )
}

export default function PlanClient({ plans, projects, samples, equipment, initialProjectId }: { plans: Plan[]; projects: Option[]; samples: Option[]; equipment: Option[]; initialProjectId?: string | null }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  useEffect(() => {
    if (!initialProjectId) return
    const plan = plans.find((pl) => pl.projectId === initialProjectId)
    if (plan) setActiveId(plan.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId])
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddSample, setShowAddSample] = useState(false)
  const [pending, startTransition] = useTransition()

  const active = plans.find((p) => p.id === activeId) ?? null

  function onCreate(formData: FormData) {
    startTransition(async () => { await createPlan(formData); setShowCreate(false) })
  }

  function onAddSample(formData: FormData) {
    if (!active) return
    formData.set("projectId", active.projectId)
    startTransition(async () => { await addSample(formData); setShowAddSample(false) })
  }

  function onDeletePlan(id: string) {
    if (!confirm("Xóa kế hoạch này?")) return
    startTransition(async () => { await deletePlan(id); setActiveId(null) })
  }

  function onSubmitItem(formData: FormData) {
    if (!active) return
    formData.set("testPlanId", active.id)
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveItem(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDeleteItem(id: string) {
    if (!confirm("Xóa bài thử này?")) return
    startTransition(async () => { await deleteItem(id) })
  }

  if (!active) {
    return (
      <section id="page-plan">
        <div id="plan-card-overview">
          <div className="pl-top">
            <button className="btn-pri" id="plan-create-btn" onClick={() => setShowCreate(true)}>+ Tạo kế hoạch</button>
          </div>
          {showCreate && (
            <div className="card" style={{ marginBottom: 16 }}>
              <form action={onCreate}>
                <div className="row">
                  <div className="field">
                    <label>Dự án</label>
                    <select name="projectId" required>
                      <option value="">-- Chọn dự án --</option>
                      {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                  </div>
                  <div className="field"><label>Tên kế hoạch</label><input name="title" placeholder="Tên kế hoạch" required /></div>
                </div>
                <div className="row">
                  <button className="btn-pri" type="submit">Tạo</button>
                  <button className="btn-line" type="button" onClick={() => setShowCreate(false)}>Hủy</button>
                </div>
              </form>
            </div>
          )}
          <div className="grid">
            {plans.map((p) => {
              const pass = p.items.filter((i) => i.result === "pass").length
              const fail = p.items.filter((i) => i.result === "fail").length
              const total = p.items.length
              return (
                <div className="card" key={p.id}>
                  <div className="ch"><h3>{p.title || p.projectName}</h3></div>
                  <div className="row"><span>Dự án</span><span>{p.projectName}</span></div>
                  <div className="row"><span>Bài thử</span><span>{total}</span></div>
                  <div className="row"><span>Đạt/Không đạt</span><span>{pass}/{fail}</span></div>
                  <div className="row">
                    <button className="btn-line" onClick={() => setActiveId(p.id)}>Xem chi tiết</button>
                    <button className="btn-line" onClick={() => onDeletePlan(p.id)}>Xóa</button>
                  </div>
                </div>
              )
            })}
          </div>
          {plans.length === 0 && (
            <div className="pl-empty" id="plan-empty">
              <b>Dự án này chưa có kế hoạch thử nghiệm.</b>
              Tạo kế hoạch để bắt đầu lập kế hoạch theo mẫu và trình tự.
            </div>
          )}
        </div>
      </section>
    )
  }

  const total = active.items.length
  const pass = active.items.filter((i) => i.result === "pass").length
  const fail = active.items.filter((i) => i.result === "fail").length
  const ongoing = active.items.filter((i) => i.result === "pending").length
  const now = new Date()
  const overdue = active.items.filter((i) => i.planEnd && new Date(i.planEnd) < now && i.result === "pending").length
  const progress = total ? Math.round(active.items.reduce((s, i) => s + (i.progress ?? 0), 0) / total) : 0

  const workloadMap: Record<string, number> = {}
  const priorityMap: Record<string, number> = { high: 0, med: 0, low: 0 }
  const packMap: Record<string, number> = {}
  for (const i of active.items) {
    const w = i.assignee || "Chưa giao"
    workloadMap[w] = (workloadMap[w] || 0) + 1
    const pr = i.priority || "med"
    priorityMap[pr] = (priorityMap[pr] || 0) + 1
    const pack = i.sampleName || "Khác"
    packMap[pack] = (packMap[pack] || 0) + 1
  }

  return (
    <section id="page-plan">
      <div className="ch">
        <button className="btn-line" onClick={() => setActiveId(null)}>&larr; Danh sách kế hoạch</button>
        <h3>{active.title || active.projectName}</h3>
      </div>
      <div id="plan-detail-shell">
        <div id="plan-content">
          <div className="grid kpis" style={{ marginBottom: 18 }}>
            <div className="kcard kb"><div className="v" id="plan-k-total">{total}</div><div className="l">Tổng bài thử</div><div className="s">Trong kế hoạch</div></div>
            <div className="kcard kg"><div className="v" id="plan-k-pass">{pass}</div><div className="l">Đạt</div><div className="s">Số bài đạt</div></div>
            <div className="kcard kr"><div className="v" id="plan-k-fail">{fail}</div><div className="l">Không đạt</div><div className="s">Số bài không đạt</div></div>
            <div className="kcard kp"><div className="v" id="plan-k-ongoing">{ongoing}</div><div className="l">Đang chạy</div><div className="s">Đang triển khai</div></div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="ch"><h3>Tổng quan tiến độ &amp; kết quả</h3><span>Toàn bộ kế hoạch</span></div>
            <div className="pl-donut-wrap">
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Tiến độ</div>
                <Donut pass={pass} fail={fail} ongoing={ongoing} />
                <div className="pl-legend" id="plan-legend-status">
                  <div className="li"><span className="dot" style={{ background: "var(--green)" }} />Đạt: {pass}</div>
                  <div className="li"><span className="dot" style={{ background: "var(--red)" }} />Không đạt: {fail}</div>
                  <div className="li"><span className="dot" style={{ background: "var(--pri)" }} />Đang chạy: {ongoing}</div>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Tỷ lệ đạt / không đạt</div>
                <Donut pass={pass} fail={fail} ongoing={0} />
                <div className="pl-legend" id="plan-legend-result">Đạt: {pass} / Không đạt: {fail}</div>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Tiến độ trung bình</div>
                <div className="pctbig" id="plan-k-progress" style={{ marginBottom: 14 }}>{progress}%</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Quá hạn kế hoạch (chưa xong, trễ ngày kết thúc)</div>
                <div className="pctbig" style={{ fontSize: 22, color: "var(--red)", marginBottom: 0 }}><span id="plan-overdue-count">{overdue}</span> bài</div>
              </div>
              <div style={{ flex: 1, minWidth: 170 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Khối lượng theo người phụ trách</div>
                <div id="plan-pic-workload">
                  {Object.entries(workloadMap).map(([name, count]) => (<div className="row" key={name}><span>{name}</span><span>{count}</span></div>))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Tiến độ theo mẫu</div>
                <div id="plan-pack-summary" className="pl-pack-tiles">
                  {Object.entries(packMap).map(([name, count]) => (<span className="chip" key={name}>{name} ({count})</span>))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 190 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Tỷ lệ hoàn thành theo mằc độ ưu tiên</div>
                <div id="plan-priority-stats">
                  <div className="row"><span>Cao</span><span>{priorityMap.high || 0}</span></div>
                  <div className="row"><span>Trung bình</span><span>{priorityMap.med || 0}</span></div>
                  <div className="row"><span>Thấp</span><span>{priorityMap.low || 0}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="pl-toolbar">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Sơ đồ Gantt kế hoạch thử nghiệm</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Mỏi mẫu chạy một chuỗi bài thử tuần tự riêng</span>
              </div>
            </div>
            <div className="pl-gantt-wrap" id="plan-gantt-wrap">
              {active.items.filter((i) => i.planStart && i.planEnd).map((i) => (
                <div className="row" key={i.id}><span>{i.name}</span><span>{i.planStart!.slice(0, 10)} &rarr; {i.planEnd!.slice(0, 10)}</span></div>
              ))}
              {active.items.filter((i) => i.planStart && i.planEnd).length === 0 && <div style={{ color: "var(--muted)", fontSize: 13, padding: 14 }}>Chưa có dữ liệu mốc thời gian để vẽ Gantt.</div>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="ch"><h3>Mẫu thử nghiệm và bài thử</h3><span id="plan-pack-count">{Object.keys(packMap).length} mẫu</span></div>
            <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
              <button className="btn-pri" id="plan-add-pack-btn" onClick={() => { setShowAddSample(true); setShowForm(false) }}>+ Thêm mẫu</button>
              <button className="btn-line" id="plan-add-item-btn" onClick={() => { setEditing(null); setShowForm(true); setShowAddSample(false) }}>+ Thêm bài thử</button>
            </div>
            {showAddSample && (
              <div className="card" style={{ marginBottom: 12 }}>
                <form action={onAddSample}>
                  <div className="row">
                    <div className="field"><label>Mã mẫu *</label><input name="code" required /></div>
                    <div className="field"><label>Số seri (S/N)</label><input name="serialNumber" /></div>
                    <div className="field"><label>Số lượng</label><input name="qty" type="number" min={1} defaultValue={1} /></div>
                  </div>
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button type="button" className="btn-line" onClick={() => setShowAddSample(false)}>Hủy</button>
                    <button type="submit" className="btn-pri" disabled={pending}>Lưu mẫu</button>
                  </div>
                </form>
              </div>
            )}
            <div id="plan-pack-list">
              {showForm && (
                <div className="card">
                  <form action={onSubmitItem}>
                    <div className="row">
                      <div className="field"><label>Tên bài thử</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
                      <div className="field"><label>Mã báo cáo</label><input name="reportCode" defaultValue={editing?.reportCode ?? ""} /></div>
                      <div className="field">
                        <label>Mẫu</label>
                        <select name="sampleId" defaultValue={editing?.sampleId ?? ""}>
                          <option value="">-- Không --</option>
                          {samples.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="field">
                        <label>Ưu tiên</label>
                        <select name="priority" defaultValue={editing?.priority ?? "med"}>
                          <option value="high">Cao</option>
                          <option value="med">Trung bình</option>
                          <option value="low">Thấp</option>
                        </select>
                      </div>
                      <div className="field"><label>Tiêu chuẩn</label><input name="standard" defaultValue={editing?.standard ?? ""} /></div>
                      <div className="field">
                        <label>Thiết bị</label>
                        <select name="equipmentId" defaultValue={editing?.equipmentId ?? ""}>
                          <option value="">-- Không --</option>
                          {equipment.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="field"><label>Phụ trách</label><input name="assignee" defaultValue={editing?.assignee ?? ""} /></div>
                      <div className="field">
                        <label>Kết quả</label>
                        <select name="result" defaultValue={editing?.result ?? "pending"}>
                          <option value="pending">Đang chạy</option>
                          <option value="pass">Đạt</option>
                          <option value="fail">Không đạt</option>
                        </select>
                      </div>
                      <div className="field"><label>Tiến độ (%)</label><input type="number" name="progress" defaultValue={editing?.progress ?? 0} /></div>
                    </div>
                    <div className="row">
                      <div className="field"><label>Bắt đầu KH</label><input type="date" name="planStart" defaultValue={editing?.planStart ? editing.planStart.slice(0, 10) : ""} /></div>
                      <div className="field"><label>Kết thúc KH</label><input type="date" name="planEnd" defaultValue={editing?.planEnd ? editing.planEnd.slice(0, 10) : ""} /></div>
                      <div className="field"><label>Bắt đầu TT</label><input type="date" name="actualStart" defaultValue={editing?.actualStart ? editing.actualStart.slice(0, 10) : ""} /></div>
                      <div className="field"><label>Kết thúc TT</label><input type="date" name="actualEnd" defaultValue={editing?.actualEnd ? editing.actualEnd.slice(0, 10) : ""} /></div>
                    </div>
                    <div className="field"><label>Ghi chú</label><textarea name="note" defaultValue={editing?.note ?? ""} /></div>
                    <div className="row">
                      <button className="btn-pri" type="submit" disabled={pending}>Lưu</button>
                      <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Hủy</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="ch" style={{ padding: 0 }}>
              <div><h3>Xuất báo cáo kế hoạch</h3><span>Tải danh sách bài thử chi tiết dưới dạng file</span></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn-line" id="plan-export-excel" onClick={() => alert("Xuất Excel sẽ được bổ sung.")}>&#10515; Xuất Excel</button>
                <button type="button" className="btn-line" id="plan-export-pdf" onClick={() => alert("Xuất PDF sẽ được bổ sung.")}>&#10515; Xuất PDF</button>
              </div>
            </div>
            <table id="plan-detail-table">
              <thead><tr>
                <th>Số thứ tự</th><th>Mã báo cáo</th><th>Mẫu</th><th>Tên bài thử</th><th>Ưu tiên</th><th>Tiêu chuẩn</th><th>Thiết bị</th><th>Người phụ trách</th>
                <th>Bắt đầu kế hoạch</th><th>Kết thúc kế hoạch</th><th>Thời lượng kế hoạch</th>
                <th>Bắt đầu thực tế</th><th>Kết thúc thực tế</th><th>Thời lượng thực tế</th>
                <th>Kết quả</th><th>% HT</th><th>Ghi chú</th><th>Thao tác</th>
              </tr></thead>
              <tbody id="plan-detail-body">
                {active.items.map((i, idx) => (
                  <tr key={i.id}>
                    <td>{idx + 1}</td>
                    <td>{i.reportCode ?? "-"}</td>
                    <td>{i.sampleName ?? "-"}</td>
                    <td>{i.name}</td>
                    <td>{PRIORITY_LABEL[i.priority ?? "med"]}</td>
                    <td>{i.standard ?? "-"}</td>
                    <td>{i.equipmentName ?? "-"}</td>
                    <td>{i.assignee ?? "-"}</td>
                    <td>{i.planStart ? i.planStart.slice(0, 10) : "-"}</td>
                    <td>{i.planEnd ? i.planEnd.slice(0, 10) : "-"}</td>
                    <td>{daysBetween(i.planStart, i.planEnd) ?? "-"}{daysBetween(i.planStart, i.planEnd) !== null ? " ngày" : ""}</td>
                    <td>{i.actualStart ? i.actualStart.slice(0, 10) : "-"}</td>
                    <td>{i.actualEnd ? i.actualEnd.slice(0, 10) : "-"}</td>
                    <td>{daysBetween(i.actualStart, i.actualEnd) ?? "-"}{daysBetween(i.actualStart, i.actualEnd) !== null ? " ngày" : ""}</td>
                    <td>{RESULT_LABEL[i.result ?? "pending"]}</td>
                    <td>{i.progress ?? 0}%</td>
                    <td>{i.note ?? "-"}</td>
                    <td>
                      <button className="btn-line" onClick={() => { setEditing(i); setShowForm(true) }}>Sửa</button>
                      <button className="btn-line" onClick={() => onDeleteItem(i.id)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
