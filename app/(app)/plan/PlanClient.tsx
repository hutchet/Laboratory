"use client"

import { useState, useTransition } from "react"
import { createPlan, deletePlan, saveItem, deleteItem } from "./actions"

type Item = {
  id: string; sampleId: string | null; sampleName: string | null; name: string; priority: string | null; standard: string | null
  assignee: string | null; planStart: string | null; planEnd: string | null; actualStart: string | null; actualEnd: string | null
  result: string | null; progress: number | null; note: string | null
}
type Plan = { id: string; title: string | null; projectId: string; projectName: string; items: Item[] }
type Option = { id: string; name: string }

const RESULT_LABEL: Record<string, string> = { pending: "Dang chay", pass: "Dat", fail: "Khong dat" }

export default function PlanClient({ plans, projects, samples }: { plans: Plan[]; projects: Option[]; samples: Option[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [pending, startTransition] = useTransition()

  const active = plans.find((p) => p.id === activeId) ?? null

  function onCreate(formData: FormData) {
    startTransition(async () => { await createPlan(formData); setShowCreate(false) })
  }

  function onDeletePlan(id: string) {
    if (!confirm("Xoa ke hoach nay?")) return
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
    if (!confirm("Xoa bai thu nay?")) return
    startTransition(async () => { await deleteItem(id) })
  }

  if (!active) {
    return (
      <section id="page-plan">
        <div id="plan-card-overview">
          <div className="pl-top">
            <button className="btn-pri" id="plan-create-btn" onClick={() => setShowCreate(true)}>+ Tao ke hoach</button>
          </div>
          {showCreate && (
            <div className="card" style={{ marginBottom: 16 }}>
              <form action={onCreate}>
                <select name="projectId" required>
                  <option value="">-- Chon du an --</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
                <input name="title" placeholder="Ten ke hoach" required />
                <button className="btn-pri" type="submit">Tao</button>
                <button className="btn-line" type="button" onClick={() => setShowCreate(false)}>Huy</button>
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
                  <div className="row"><span>Du an</span><span>{p.projectName}</span></div>
                  <div className="row"><span>Bai thu</span><span>{total}</span></div>
                  <div className="row"><span>Dat/Khong dat</span><span>{pass}/{fail}</span></div>
                  <div className="row">
                    <button className="btn-line" onClick={() => setActiveId(p.id)}>Xem chi tiet</button>
                    <button className="btn-line" onClick={() => onDeletePlan(p.id)}>Xoa</button>
                  </div>
                </div>
              )
            })}
          </div>
          {plans.length === 0 && (
            <div className="pl-empty" id="plan-empty">
              <b>Chua co ke hoach thu nghiem nao.</b>
              Tao ke hoach de bat dau lap ke hoach theo mau va trinh tu.
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
    const w = i.assignee || "Chua giao"
    workloadMap[w] = (workloadMap[w] || 0) + 1
    const pr = i.priority || "med"
    priorityMap[pr] = (priorityMap[pr] || 0) + 1
    const pack = i.sampleName || "Khac"
    packMap[pack] = (packMap[pack] || 0) + 1
  }

  return (
    <section id="page-plan">
      <div className="ch">
        <button className="btn-line" onClick={() => setActiveId(null)}>&larr; Danh sach ke hoach</button>
        <h3>{active.title || active.projectName}</h3>
      </div>
      <div id="plan-detail-shell">
        <div id="plan-content">
          <div className="grid kpis" style={{ marginBottom: 18 }}>
            <div className="kcard kb"><div className="v" id="plan-k-total">{total}</div><div className="l">Tong bai thu</div><div className="s">Trong ke hoach</div></div>
            <div className="kcard kg"><div className="v" id="plan-k-pass">{pass}</div><div className="l">Dat</div><div className="s">So bai dat</div></div>
            <div className="kcard kr"><div className="v" id="plan-k-fail">{fail}</div><div className="l">Khong dat</div><div className="s">So bai khong dat</div></div>
            <div className="kcard kp"><div className="v" id="plan-k-ongoing">{ongoing}</div><div className="l">Dang chay</div><div className="s">Dang trien khai</div></div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="ch"><h3>Tong quan tien do &amp; ket qua</h3><span>Toan bo ke hoach</span></div>
            <div className="pl-donut-wrap">
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Tien do</div>
                <svg width="120" height="120" viewBox="0 0 42 42" id="plan-donut-status" />
                <div className="pl-legend" id="plan-legend-status">{doneN(total, ongoing, pass, fail)}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Ty le dat / khong dat</div>
                <svg width="120" height="120" viewBox="0 0 42 42" id="plan-donut-result" />
                <div className="pl-legend" id="plan-legend-result">Dat: {pass} / Khong dat: {fail}</div>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Tien do trung binh</div>
                <div className="pctbig" id="plan-k-progress" style={{ marginBottom: 14 }}>{progress}%</div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Qua han ke hoach</div>
                <div className="pctbig" style={{ fontSize: 22, color: "var(--red)", marginBottom: 0 }}><span id="plan-overdue-count">{overdue}</span> bai</div>
              </div>
              <div style={{ flex: 1, minWidth: 170 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Khoi luong theo nguoi phu trach</div>
                <div id="plan-pic-workload">
                  {Object.entries(workloadMap).map(([name, count]) => (<div className="row" key={name}><span>{name}</span><span>{count}</span></div>))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Tien do theo mau</div>
                <div id="plan-pack-summary" className="pl-pack-tiles">
                  {Object.entries(packMap).map(([name, count]) => (<span className="chip" key={name}>{name} ({count})</span>))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 190 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Ty le hoan thanh theo muc do uu tien</div>
                <div id="plan-priority-stats">
                  <div className="row"><span>Cao</span><span>{priorityMap.high || 0}</span></div>
                  <div className="row"><span>Trung binh</span><span>{priorityMap.med || 0}</span></div>
                  <div className="row"><span>Thap</span><span>{priorityMap.low || 0}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="pl-toolbar">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>So do Gantt ke hoach thu nghiem</h3>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Moi mau chay mot chuoi bai thu tuan tu rieng</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="pl-daynav" id="plan-daynav" />
                <div className="pl-zoom" id="plan-zoom" />
              </div>
            </div>
            <div className="pl-gantt-wrap" id="plan-gantt-wrap">
              {active.items.filter((i) => i.planStart && i.planEnd).map((i) => (
                <div className="row" key={i.id}><span>{i.name}</span><span>{i.planStart!.slice(0, 10)} &rarr; {i.planEnd!.slice(0, 10)}</span></div>
              ))}
              {active.items.filter((i) => i.planStart && i.planEnd).length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Chua co du lieu moc thoi gian de ve Gantt.</div>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="ch"><h3>Mau thu nghiem va bai thu</h3><span id="plan-pack-count">{Object.keys(packMap).length} mau</span></div>
            <div style={{ marginBottom: 12 }}>
              <button className="btn-pri" id="plan-add-pack-btn" onClick={() => { setEditing(null); setShowForm(true) }}>+ Them bai thu</button>
            </div>
            <div id="plan-pack-list">
              {showForm && (
                <div className="card">
                  <form action={onSubmitItem}>
                    <div className="row">
                      <div className="field"><label>Ten bai thu</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
                      <div className="field">
                        <label>Mau</label>
                        <select name="sampleId" defaultValue={editing?.sampleId ?? ""}>
                          <option value="">-- Khong --</option>
                          {samples.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Uu tien</label>
                        <select name="priority" defaultValue={editing?.priority ?? "med"}>
                          <option value="high">Cao</option>
                          <option value="med">Trung binh</option>
                          <option value="low">Thap</option>
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="field"><label>Tieu chuan</label><input name="standard" defaultValue={editing?.standard ?? ""} /></div>
                      <div className="field"><label>Phu trach</label><input name="assignee" defaultValue={editing?.assignee ?? ""} /></div>
                      <div className="field">
                        <label>Ket qua</label>
                        <select name="result" defaultValue={editing?.result ?? "pending"}>
                          <option value="pending">Dang chay</option>
                          <option value="pass">Dat</option>
                          <option value="fail">Khong dat</option>
                        </select>
                      </div>
                    </div>
                    <div className="row">
                      <div className="field"><label>Bat dau KH</label><input type="date" name="planStart" defaultValue={editing?.planStart ? editing.planStart.slice(0, 10) : ""} /></div>
                      <div className="field"><label>Ket thuc KH</label><input type="date" name="planEnd" defaultValue={editing?.planEnd ? editing.planEnd.slice(0, 10) : ""} /></div>
                      <div className="field"><label>Tien do (%)</label><input type="number" name="progress" defaultValue={editing?.progress ?? 0} /></div>
                    </div>
                    <div className="field"><label>Ghi chu</label><textarea name="note" defaultValue={editing?.note ?? ""} /></div>
                    <div className="row">
                      <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
                      <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="ch" style={{ padding: 0 }}>
              <div><h3>Xuat bao cao ke hoach</h3><span>Tai danh sach bai thu chi tiet duoi dang file</span></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn-line" id="plan-export-excel" onClick={() => alert("Xuat Excel se duoc bo sung.")}>&#10515; Xuat Excel</button>
                <button type="button" className="btn-line" id="plan-export-pdf" onClick={() => alert("Xuat PDF se duoc bo sung.")}>&#10515; Xuat PDF</button>
              </div>
            </div>
            <table id="plan-detail-table">
              <thead><tr>
                <th>So thu tu</th><th>Mau</th><th>Ten bai thu</th><th>Uu tien</th><th>Tieu chuan</th><th>Nguoi phu trach</th><th>Bat dau KH</th><th>Ket thuc KH</th><th>Bat dau TT</th><th>Ket thuc TT</th><th>Ket qua</th><th>% HT</th><th>Ghi chu</th><th>Thao tac</th>
              </tr></thead>
              <tbody id="plan-detail-body">
                {active.items.map((i, idx) => (
                  <tr key={i.id}>
                    <td>{idx + 1}</td>
                    <td>{i.sampleName ?? "-"}</td>
                    <td>{i.name}</td>
                    <td>{i.priority}</td>
                    <td>{i.standard ?? "-"}</td>
                    <td>{i.assignee ?? "-"}</td>
                    <td>{i.planStart ? i.planStart.slice(0, 10) : "-"}</td>
                    <td>{i.planEnd ? i.planEnd.slice(0, 10) : "-"}</td>
                    <td>{i.actualStart ? i.actualStart.slice(0, 10) : "-"}</td>
                    <td>{i.actualEnd ? i.actualEnd.slice(0, 10) : "-"}</td>
                    <td>{RESULT_LABEL[i.result ?? "pending"]}</td>
                    <td>{i.progress ?? 0}%</td>
                    <td>{i.note ?? "-"}</td>
                    <td>
                      <button className="btn-line" onClick={() => { setEditing(i); setShowForm(true) }}>Sua</button>
                      <button className="btn-line" onClick={() => onDeleteItem(i.id)}>Xoa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {active.items.length === 0 && <div className="empty">Chua co bai thu nao.</div>}
          </div>
        </div>
      </div>
    </section>
  )
}

function doneN(total: number, ongoing: number, pass: number, fail: number) {
  const done = pass + fail
  return "Da chay: " + done + " / Dang chay: " + ongoing + " / Tong: " + total
}
