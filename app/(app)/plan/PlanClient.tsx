"use client"

import { useState, useTransition } from "react"
import { createPlan, deletePlan, saveItem, deleteItem } from "./actions"

type Item = {
  id: string; sampleId: string | null; sampleName: string | null; name: string; priority: string | null; standard: string | null
  assignee: string | null; planStart: string | null; planEnd: string | null; result: string | null; progress: number | null; note: string | null
}
type Plan = { id: string; title: string | null; projectId: string; projectName: string; items: Item[] }
type Option = { id: string; name: string }

export default function PlanClient({ plans, projects, samples }: { plans: Plan[]; projects: Option[]; samples: Option[] }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const active = plans.find((p) => p.id === activeId) ?? null

  function onCreate(formData: FormData) {
    startTransition(async () => { await createPlan(formData) })
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
    if (!confirm("Xoa hang muc nay?")) return
    startTransition(async () => { await deleteItem(id) })
  }

  if (!active) {
    return (
      <section id="page-plan">
        <div className="section-head">
          <h2>Ke hoach thu nghiem</h2>
          <form action={onCreate}>
            <select name="projectId" required>
              <option value="">-- Chon du an --</option>
              {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            <input name="title" placeholder="Ten ke hoach" required />
            <button className="btn-pri" type="submit">+ Tao ke hoach</button>
          </form>
        </div>
        <div className="grid" id="plan-card-overview">
          {plans.map((p) => {
            const pass = p.items.filter((i) => i.result === "pass").length
            const fail = p.items.filter((i) => i.result === "fail").length
            const total = p.items.length
            return (
              <div className="card" key={p.id}>
                <div className="ch"><h3>{p.title || p.projectName}</h3></div>
                <div className="row"><span>Du an</span><span>{p.projectName}</span></div>
                <div className="row"><span>Hang muc</span><span>{total}</span></div>
                <div className="row"><span>Dat/Khong dat</span><span>{pass}/{fail}</span></div>
                <div className="row">
                  <button className="btn-line" onClick={() => setActiveId(p.id)}>Xem chi tiet</button>
                  <button className="btn-line" onClick={() => onDeletePlan(p.id)}>Xoa</button>
                </div>
              </div>
            )
          })}
        </div>
        {plans.length === 0 && <div className="empty">Chua co ke hoach thu nghiem nao.</div>}
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
      <div className="grid kpis" id="plan-detail-shell">
        <div className="kcard"><div className="l">Tong hang muc</div><div className="v" id="plan-k-total">{total}</div></div>
        <div className="kcard"><div className="l">Dat</div><div className="v" id="plan-k-pass">{pass}</div></div>
        <div className="kcard"><div className="l">Khong dat</div><div className="v" id="plan-k-fail">{fail}</div></div>
        <div className="kcard"><div className="l">Dang thuc hien</div><div className="v" id="plan-k-ongoing">{ongoing}</div></div>
      </div>
      <div className="exp-progress-wrap">
        <div className="exp-progress-lab" id="plan-k-progress">Tien do: {progress}%</div>
        <div className="exp-progress-track"><div className="exp-progress-fill" style={{ width: progress + "%" }} /></div>
      </div>
      <div className="row" id="plan-overdue-count">Qua han: {overdue}</div>

      <div className="card" id="plan-pic-workload">
        <div className="ch"><h3>Khoi luong theo nguoi phu trach</h3></div>
        {Object.entries(workloadMap).map(([name, count]) => (<div className="row" key={name}><span>{name}</span><span>{count}</span></div>))}
      </div>

      <div className="card" id="plan-pack-summary">
        <div className="ch"><h3>Theo mau (pack)</h3></div>
        <div id="plan-pack-list">
          {Object.entries(packMap).map(([name, count]) => (<span className="chip" key={name}>{name} ({count})</span>))}
        </div>
      </div>

      <div className="card" id="plan-priority-stats">
        <div className="ch"><h3>Theo muc uu tien</h3></div>
        <div className="row"><span>Cao</span><span>{priorityMap.high || 0}</span></div>
        <div className="row"><span>Trung binh</span><span>{priorityMap.med || 0}</span></div>
        <div className="row"><span>Thap</span><span>{priorityMap.low || 0}</span></div>
      </div>

      <div className="card" id="plan-gantt-wrap">
        <div className="ch"><h3>Tien do theo thoi gian</h3></div>
        {active.items.filter((i) => i.planStart && i.planEnd).map((i) => (
          <div className="row" key={i.id}><span>{i.name}</span><span>{i.planStart!.slice(0, 10)} - {i.planEnd!.slice(0, 10)}</span></div>
        ))}
      </div>

      <div className="section-head">
        <button className="btn-pri" onClick={() => { setEditing(null); setShowForm(true) }}>+ Them hang muc</button>
        <button className="btn-line" id="plan-export-excel" onClick={() => alert("Xuat Excel se duoc bo sung.")}>Xuat Excel</button>
        <button className="btn-line" id="plan-export-pdf" onClick={() => alert("Xuat PDF se duoc bo sung.")}>Xuat PDF</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmitItem}>
            <div className="row">
              <div className="field"><label>Ten hang muc</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
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
                  <option value="pending">Dang thuc hien</option>
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

      <table>
        <thead><tr><th>Hang muc</th><th>Mau</th><th>Uu tien</th><th>Tieu chuan</th><th>Phu trach</th><th>Bat dau</th><th>Ket thuc</th><th>Ket qua</th><th>Tien do</th><th>Thao tac</th></tr></thead>
        <tbody id="plan-detail-body">
          {active.items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.sampleName ?? "-"}</td>
              <td>{i.priority}</td>
              <td>{i.standard ?? "-"}</td>
              <td>{i.assignee ?? "-"}</td>
              <td>{i.planStart ? i.planStart.slice(0, 10) : "-"}</td>
              <td>{i.planEnd ? i.planEnd.slice(0, 10) : "-"}</td>
              <td>{i.result}</td>
              <td>{i.progress ?? 0}%</td>
              <td>
                <button className="btn-line" onClick={() => { setEditing(i); setShowForm(true) }}>Sua</button>
                <button className="btn-line" onClick={() => onDeleteItem(i.id)}>Xoa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {active.items.length === 0 && <div className="empty">Chua co hang muc nao.</div>}
    </section>
  )
}
