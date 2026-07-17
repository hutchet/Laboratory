"use client"

import { useMemo, useState, useTransition } from "react"
import { createPlan, addPhase, saveItem, deleteItem, deletePlan } from "./actions"

type Item = { id: string; name: string; phaseId: string | null; assignee: string | null; planStart: string | null; planEnd: string | null; actualStart: string | null; actualEnd: string | null; status: string | null; note: string | null }
type Phase = { id: string; name: string }
type Plan = { id: string; title: string; status: string | null; phases: Phase[]; items: Item[] }

const STATUS_LABEL: Record<string, string> = { todo: "Chua bat dau", doing: "Dang trien khai", done: "Hoan thanh", overdue: "Qua han" }

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
    if (!confirm("Xoa dau viec nay?")) return
    startTransition(async () => { await deleteItem(id) })
  }

  function onDeletePlan(id: string) {
    if (!confirm("Xoa ke hoach nay?")) return
    startTransition(async () => { await deletePlan(id); setActiveId(null) })
  }

  if (!active) {
    return (
      <section id="page-auditplan">
        <div id="ap-plan-overview">
          <div className="section-head" style={{ marginBottom: 16 }}>
            <h3>Ke hoach audit</h3>
            <div className="tools">
              <div className="search" style={{ maxWidth: 260 }}>
                <input id="ap-plan-search" placeholder="Tim ke hoach..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <form action={onCreatePlan} style={{ display: "flex", gap: 8 }}>
                <input name="title" placeholder="Ten ke hoach moi" required />
                <button className="btn-pri" id="ap-plan-create-btn" type="submit">+ Tao ke hoach</button>
              </form>
            </div>
          </div>
          <div id="ap-plan-cards" className="grid">
            {filtered.map((p) => {
              const d = p.items.filter((i) => i.status === "done").length
              const t = p.items.length
              return (
                <div className="card" key={p.id}>
                  <div className="ch"><h3>{p.title}</h3></div>
                  <div className="row"><span>Dau viec</span><span>{d}/{t}</span></div>
                  <div className="row"><span>Hang muc (phase)</span><span>{p.phases.length}</span></div>
                  <div className="row">
                    <button className="btn-line" onClick={() => setActiveId(p.id)}>Xem chi tiet</button>
                    <button className="btn-line" onClick={() => onDeletePlan(p.id)}>Xoa</button>
                  </div>
                </div>
              )
            })}
          </div>
          {filtered.length === 0 && <div className="empty">Chua co ke hoach audit nao.</div>}
        </div>
      </section>
    )
  }

  return (
    <section id="page-auditplan">
      <div className="ch">
        <button className="btn-line" onClick={() => setActiveId(null)}>&larr; Danh sach ke hoach</button>
        <h3>{active.title}</h3>
      </div>
      <div id="ap-plan-detail-shell">
        <div className="grid kpis" style={{ marginBottom: 18 }}>
          <div className="kcard kb"><div className="v" id="ap-k-total">{total}</div><div className="l">Tong dau viec</div><div className="s">Trong ke hoach audit</div></div>
          <div className="kcard kg"><div className="v" id="ap-k-done">{doneN}</div><div className="l">Hoan thanh</div><div className="s">Da co ngay ket thuc thuc te</div></div>
          <div className="kcard kp"><div className="v" id="ap-k-doing">{doingN}</div><div className="l">Dang trien khai</div><div className="s">Trong khung thoi gian ke hoach</div></div>
          <div className="kcard kr"><div className="v" id="ap-k-overdue">{overdueN}</div><div className="l">Qua han</div><div className="s">Tre ngay ket thuc ke hoach</div></div>
        </div>

        <div className="card" style={{ marginBottom: 18 }} id="ap-overview-card">
          <div className="ch"><div><h3 id="ap-ov-title">Tong quan tien do ISO 17025</h3><span>Toan bo ke hoach audit</span></div></div>
          <div className="pl-donut-wrap">
            <div className="pl-donut-col">
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, marginBottom: 6, textAlign: "center" }}>Trang thai dau viec</div>
              <div className="pl-donut-inline">
                <svg width="120" height="120" viewBox="0 0 42 42" id="ap-donut-status" />
                <div className="pl-legend pl-legend-side" id="ap-legend-status">
                  {Object.entries({ todo: total - doneN - doingN - overdueN, doing: doingN, done: doneN, overdue: overdueN }).map(([k, v]) => (
                    <div key={k}>{STATUS_LABEL[k]}: {v as number}</div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 170 }}>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>Ty le hoan thanh</div>
              <div className="pctbig" id="ap-k-progress" style={{ marginBottom: 14 }}>{progress}%</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>So nhom hang muc (phase)</div>
              <div className="pctbig" style={{ fontSize: 22, color: "var(--ink)" }}><span id="ap-k-phases">{active.phases.length}</span> nhom</div>
            </div>
            <div style={{ flex: 1, minWidth: 190 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Khoi luong theo nguoi phu trach</div>
              <div id="ap-pic-workload">
                {Object.entries(workloadMap).map(([name, count]) => (<div className="row" key={name}><span>{name}</span><span>{count}</span></div>))}
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="pl-toolbar">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>So do tien do (Gantt) ke hoach audit ISO 17025</h3>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Theo moc thoi gian ke hoach cua tung dau viec, nhom theo hang muc</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="pl-daynav" id="ap-daynav" />
              <div className="pl-zoom" id="ap-zoom" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 12, color: "var(--muted)", flexWrap: "wrap", marginBottom: 10 }}>
            <span><span className="ap-legend-dot" style={{ background: "var(--green)" }} />Hoan thanh</span>
            <span><span className="ap-legend-dot" style={{ background: "var(--amber)" }} />Dang trien khai</span>
            <span><span className="ap-legend-dot" style={{ background: "var(--red)" }} />Qua han</span>
            <span><span className="ap-legend-dot" style={{ background: "var(--pri)" }} />Chua bat dau</span>
          </div>
          <div className="pl-gantt-wrap" id="ap-gantt-wrap">
            {active.items.filter((i) => i.planStart && i.planEnd).map((i) => (
              <div className="row" key={i.id}><span>{i.name}</span><span>{i.planStart!.slice(0, 10)} &rarr; {i.planEnd!.slice(0, 10)}</span></div>
            ))}
            {active.items.filter((i) => i.planStart && i.planEnd).length === 0 && <div style={{ color: "var(--muted)", fontSize: 13 }}>Chua co du lieu moc thoi gian de ve Gantt. Them ngay bat dau/ket thuc ke hoach cho dau viec de hien thi tai day.</div>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div className="ch"><h3>Ke hoach theo hang muc</h3><span id="ap-phase-count">{active.phases.length} hang muc</span></div>
          <div style={{ marginBottom: 12 }}>
            <form action={onAddPhase} style={{ display: "flex", gap: 8 }}>
              <input name="name" placeholder="Ten hang muc moi" required />
              <button className="btn-pri" id="ap-add-phase-btn" type="submit">+ Them hang muc</button>
            </form>
          </div>
          <div id="ap-phase-list">
            {active.phases.map((ph) => (<span className="chip" key={ph.id}>{ph.name}</span>))}
          </div>
        </div>

        <div className="card">
          <div className="ch" style={{ padding: 0 }}>
            <div><h3>Chi tiet dau viec ke hoach audit ISO 17025</h3><span id="ap-detail-count">{active.items.length} dau viec</span></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn-line" id="ap-export-excel" onClick={() => alert("Xuat Excel se duoc bo sung.")}>&#10515; Xuat Excel</button>
              <button type="button" className="btn-pri" onClick={() => { setEditing(null); setShowForm(true) }}>+ Them dau viec</button>
            </div>
          </div>

          {showForm && (
            <div className="card" style={{ marginTop: 12 }}>
              <form action={onSubmitItem}>
                <div className="row">
                  <div className="field"><label>Dau viec</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
                  <div className="field">
                    <label>Hang muc</label>
                    <select name="phaseId" defaultValue={editing?.phaseId ?? ""}>
                      <option value="">-- Khong --</option>
                      {active.phases.map((ph) => (<option key={ph.id} value={ph.id}>{ph.name}</option>))}
                    </select>
                  </div>
                  <div className="field"><label>Nguoi phu trach</label><input name="assignee" defaultValue={editing?.assignee ?? ""} /></div>
                </div>
                <div className="row">
                  <div className="field"><label>Bat dau KH</label><input type="date" name="planStart" defaultValue={editing?.planStart ? editing.planStart.slice(0, 10) : ""} /></div>
                  <div className="field"><label>Ket thuc KH</label><input type="date" name="planEnd" defaultValue={editing?.planEnd ? editing.planEnd.slice(0, 10) : ""} /></div>
                  <div className="field">
                    <label>Trang thai</label>
                    <select name="status" defaultValue={editing?.status ?? "todo"}>
                      <option value="todo">Chua bat dau</option>
                      <option value="doing">Dang trien khai</option>
                      <option value="done">Hoan thanh</option>
                    </select>
                  </div>
                </div>
                <div className="field"><label>Ghi chu</label><input name="note" defaultValue={editing?.note ?? ""} /></div>
                <div className="row">
                  <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
                  <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
                </div>
              </form>
            </div>
          )}

          <table style={{ marginTop: 12 }}>
            <thead><tr><th>No</th><th>Dau viec</th><th>Nguoi phu trach</th><th>Bat dau KH</th><th>Ket thuc KH</th><th>Bat dau TT</th><th>Ket thuc TT</th><th>Trang thai</th><th>Ghi chu</th></tr></thead>
            <tbody id="ap-detail-body">
              {active.items.map((i, idx) => (
                <tr key={i.id}>
                  <td>{idx + 1}</td>
                  <td>{i.name}</td>
                  <td>{i.assignee ?? "-"}</td>
                  <td>{i.planStart ? i.planStart.slice(0, 10) : "-"}</td>
                  <td>{i.planEnd ? i.planEnd.slice(0, 10) : "-"}</td>
                  <td>{i.actualStart ? i.actualStart.slice(0, 10) : "-"}</td>
                  <td>{i.actualEnd ? i.actualEnd.slice(0, 10) : "-"}</td>
                  <td>{STATUS_LABEL[i.status ?? "todo"]}</td>
                  <td>
                    {i.note ?? "-"}
                    <button className="btn-line" onClick={() => { setEditing(i); setShowForm(true) }}>Sua</button>
                    <button className="btn-line" onClick={() => onDeleteItem(i.id)}>Xoa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {active.items.length === 0 && <div className="empty">Chua co dau viec nao.</div>}
        </div>
      </div>
    </section>
  )
}
