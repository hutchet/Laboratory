"use client"

import { useMemo, useState, useTransition } from "react"
import { createPlan, addPhase, saveItem, deleteItem, deletePlan } from "./actions"

type Item = { id: string; name: string; phaseId: string | null; assignee: string | null; planStart: string | null; planEnd: string | null; status: string | null }
type Phase = { id: string; name: string }
type Plan = { id: string; title: string; status: string | null; phases: Phase[]; items: Item[] }

export default function AuditPlanClient({ plans }: { plans: Plan[] }) {
  const [q, setQ] = useState("")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => plans.filter((p) => !q || p.title.toLowerCase().includes(q.toLowerCase())), [plans, q])
  const active = plans.find((p) => p.id === activeId) ?? null

  const total = active?.items.length ?? 0
  const doneN = active?.items.filter((i) => i.status === "done").length ?? 0
  const doingN = active?.items.filter((i) => i.status === "doing").length ?? 0
  const now = new Date()
  const overdueN = active?.items.filter((i) => i.planEnd && new Date(i.planEnd) < now && i.status !== "done").length ?? 0
  const progress = total ? Math.round((doneN / total) * 100) : 0

  const workloadMap: Record<string, number> = {}
  for (const i of active?.items ?? []) {
    const key = i.assignee || "Chua giao"
    workloadMap[key] = (workloadMap[key] || 0) + 1
  }

  function onCreatePlan(formData: FormData) {
    startTransition(async () => { await createPlan(formData) })
  }

  function onAddPhase(formData: FormData) {
    if (!active) return
    formData.set("auditPlanId", active.id)
    startTransition(async () => { await addPhase(formData) })
  }

  function onSubmitItem(formData: FormData) {
    if (!active) return
    formData.set("auditPlanId", active.id)
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

  function onDeletePlan(id: string) {
    if (!confirm("Xoa ke hoach nay?")) return
    startTransition(async () => { await deletePlan(id); setActiveId(null) })
  }

  if (!active) {
    return (
      <section id="page-auditplan">
        <div className="section-head" id="ap-plan-overview">
          <input className="search" id="ap-plan-search" placeholder="Tim ke hoach kiem toan..." value={q} onChange={(e) => setQ(e.target.value)} />
          <form action={onCreatePlan}>
            <input name="title" placeholder="Ten ke hoach moi" required />
            <button className="btn-pri" id="ap-plan-create-btn" type="submit">+ Tao ke hoach</button>
          </form>
        </div>
        <div className="grid" id="ap-plan-cards">
          {filtered.map((p) => {
            const d = p.items.filter((i) => i.status === "done").length
            const t = p.items.length
            return (
              <div className="card" key={p.id}>
                <div className="ch"><h3>{p.title}</h3></div>
                <div className="row"><span>Hang muc</span><span>{d}/{t}</span></div>
                <div className="row"><span>Giai doan</span><span>{p.phases.length}</span></div>
                <div className="row">
                  <button className="btn-line" onClick={() => setActiveId(p.id)}>Xem chi tiet</button>
                  <button className="btn-line" onClick={() => onDeletePlan(p.id)}>Xoa</button>
                </div>
              </div>
            )
          })}
        </div>
        {filtered.length === 0 && <div className="empty">Chua co ke hoach kiem toan nao.</div>}
      </section>
    )
  }

  return (
    <section id="page-auditplan">
      <div className="ch">
        <button className="btn-line" onClick={() => setActiveId(null)}>&larr; Danh sach ke hoach</button>
        <h3>{active.title}</h3>
      </div>
      <div className="grid kpis" id="ap-plan-detail-shell">
        <div className="kcard"><div className="l">Tong hang muc</div><div className="v" id="ap-k-total">{total}</div></div>
        <div className="kcard"><div className="l">Hoan thanh</div><div className="v" id="ap-k-done">{doneN}</div></div>
        <div className="kcard"><div className="l">Dang lam</div><div className="v" id="ap-k-doing">{doingN}</div></div>
        <div className="kcard"><div className="l">Qua han</div><div className="v" id="ap-k-overdue">{overdueN}</div></div>
      </div>
      <div className="exp-progress-wrap">
        <div className="exp-progress-lab" id="ap-k-progress">Tien do: {progress}%</div>
        <div className="exp-progress-track"><div className="exp-progress-fill" style={{ width: progress + "%" }} /></div>
      </div>
      <div className="row" id="ap-k-phases">Giai doan: {active.phases.length}</div>

      <div className="card" id="ap-pic-workload">
        <div className="ch"><h3>Khoi luong theo nguoi phu trach</h3></div>
        {Object.entries(workloadMap).map(([name, count]) => (
          <div className="row" key={name}><span>{name}</span><span>{count} hang muc</span></div>
        ))}
      </div>

      <div className="card">
        <div className="ch"><h3>Giai doan</h3></div>
        <div id="ap-phase-list">
          {active.phases.map((ph) => (<span className="chip" key={ph.id}>{ph.name}</span>))}
        </div>
        <form action={onAddPhase}>
          <input name="name" placeholder="Ten giai doan moi" required />
          <button className="btn-line" id="ap-add-phase-btn" type="submit">+ Them giai doan</button>
        </form>
      </div>

      <div className="section-head">
        <button className="btn-pri" onClick={() => { setEditing(null); setShowForm(true) }}>+ Them hang muc</button>
        <button className="btn-line" id="ap-export-excel" onClick={() => alert("Xuat Excel se duoc bo sung.")}>Xuat Excel</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmitItem}>
            <div className="row">
              <div className="field"><label>Ten hang muc</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field">
                <label>Giai doan</label>
                <select name="phaseId" defaultValue={editing?.phaseId ?? ""}>
                  <option value="">-- Khong --</option>
                  {active.phases.map((ph) => (<option key={ph.id} value={ph.id}>{ph.name}</option>))}
                </select>
              </div>
              <div className="field"><label>Phu trach</label><input name="assignee" defaultValue={editing?.assignee ?? ""} /></div>
            </div>
            <div className="row">
              <div className="field"><label>Bat dau KH</label><input type="date" name="planStart" defaultValue={editing?.planStart ? editing.planStart.slice(0, 10) : ""} /></div>
              <div className="field"><label>Ket thuc KH</label><input type="date" name="planEnd" defaultValue={editing?.planEnd ? editing.planEnd.slice(0, 10) : ""} /></div>
              <div className="field">
                <label>Trang thai</label>
                <select name="status" defaultValue={editing?.status ?? "todo"}>
                  <option value="todo">Chua lam</option>
                  <option value="doing">Dang lam</option>
                  <option value="done">Hoan thanh</option>
                </select>
              </div>
            </div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <table>
        <thead><tr><th>Hang muc</th><th>Giai doan</th><th>Phu trach</th><th>Bat dau KH</th><th>Ket thuc KH</th><th>Trang thai</th><th>Thao tac</th></tr></thead>
        <tbody id="ap-detail-body">
          {active.items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{active.phases.find((ph) => ph.id === i.phaseId)?.name ?? "-"}</td>
              <td>{i.assignee ?? "-"}</td>
              <td>{i.planStart ? i.planStart.slice(0, 10) : "-"}</td>
              <td>{i.planEnd ? i.planEnd.slice(0, 10) : "-"}</td>
              <td>{i.status}</td>
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
