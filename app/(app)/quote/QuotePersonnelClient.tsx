"use client"

import { useMemo, useState, useTransition } from "react"
import { savePersonnelRateConfig, savePersonnelRouting, deletePersonnelRoutings } from "./actions"

type RateConfig = { techRate: number; engRate: number; leadRate: number; mgrRate: number; overheadPct: number }
type Row = { id: string; testCode: string | null; testName: string; prepHours: string | null; setupHours: string | null; testHours: string | null; reportHours: string | null }

function fmtVnd(n: number) { return n.toLocaleString("vi-VN") }

export default function QuotePersonnelClient({ rateConfig, routings, canManage = true }: { rateConfig: RateConfig; routings: Row[]; canManage?: boolean }) {
  const [q, setQ] = useState("")
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  const filtered = useMemo(() => routings.filter((r) => !q || r.testName.toLowerCase().includes(q.toLowerCase())), [routings, q])

  function toggle(id: string) { setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]) }
  function openNew() { setEditing(null); setShowForm(true) }
  function openEdit(r: Row) { setEditing(r); setShowForm(true) }
  function onSubmitRouting(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await savePersonnelRouting(formData); setShowForm(false); setEditing(null) })
  }
  function onSubmitRate(formData: FormData) {
    startTransition(async () => { await savePersonnelRateConfig(formData) })
  }
  function onReset(e: { currentTarget: HTMLElement }) {
    const form = e.currentTarget.closest("form") as HTMLFormElement | null
    if (!form) return
    for (const name of ["techRate", "engRate", "leadRate", "mgrRate", "overheadPct"]) {
      const el = form.elements.namedItem(name) as HTMLInputElement | null
      if (el) el.value = "0"
    }
  }
  function bulkDelete() {
    if (selected.length === 0) return
    if (!confirm(`Xoá ${selected.length} bài thử đã chọn?`)) return
    startTransition(async () => { await deletePersonnelRoutings(selected); setSelected([]) })
  }

  return (
    <section id="page-quote-personnel">
      <div className="card" data-perm="manager" style={{ marginBottom: 18, display: canManage ? undefined : "none" }}>
        <div className="section-head"><h3>Cấu hình đơn giá nhân sự (VNĐ/giờ)</h3></div>
        <form action={onSubmitRate}>
          <div className="row">
            <div className="field"><label>Kỹ thuật viên (Tech)</label><input type="number" id="qtp-tech" name="techRate" defaultValue={rateConfig.techRate} /></div>
            <div className="field"><label>Kỹ sư (Eng)</label><input type="number" id="qtp-eng" name="engRate" defaultValue={rateConfig.engRate} /></div>
            <div className="field"><label>Trưởng nhóm (Lead)</label><input type="number" id="qtp-lead" name="leadRate" defaultValue={rateConfig.leadRate} /></div>
            <div className="field"><label>Quản lý (Mgr)</label><input type="number" id="qtp-mgr" name="mgrRate" defaultValue={rateConfig.mgrRate} /></div>
            <div className="field"><label>Chi phí OH (%)</label><input type="number" id="qtp-oh" name="overheadPct" defaultValue={rateConfig.overheadPct} /></div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="submit" className="btn-pri" disabled={pending}>Lưu đơn giá</button>
            <button type="button" className="btn-line" id="qtp-reset" onClick={onReset}>↻ Đặt lại theo file gốc</button>
          </div>
        </form>
      </div>

      <div className="section-head">
        <h3>Bảng định mức nhân sự theo bài thử (<span id="qtp-count">{routings.length}</span>)</h3>
        <div className="tools">
          <div className="search" style={{ maxWidth: 260 }}>
            <input id="qtp-search" placeholder="Tìm bài thử..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {canManage && <button className="btn-line" id="qtp-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected([]) }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>}
          {canManage && editMode && (
            <button className="btn-danger" id="qtp-bulk-del" disabled={selected.length === 0 || pending} onClick={bulkDelete}>Xoá đã chọn (<span id="qtp-bulk-count">{selected.length}</span>)</button>
          )}
          {canManage && <button className="btn-pri" id="qtp-add" onClick={openNew}>+ Thêm nhân công</button>}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <form action={onSubmitRouting}>
            <input type="hidden" name="id" defaultValue={editing?.id ?? ""} />
            <div className="row">
              <div className="field"><label>Mã bài</label><input name="testCode" defaultValue={editing?.testCode ?? ""} key={`c-${editing?.id ?? "new"}`} /></div>
              <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Tên bài thử *</label><input name="testName" required defaultValue={editing?.testName ?? ""} key={`n-${editing?.id ?? "new"}`} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field"><label>CB mẫu (T/E/L)</label><input name="prepHours" placeholder="0/0/0" defaultValue={editing?.prepHours ?? ""} key={`p-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Set up (T/E/L)</label><input name="setupHours" placeholder="0/0/0" defaultValue={editing?.setupHours ?? ""} key={`s-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Thử nghiệm (T/E/L)</label><input name="testHours" placeholder="0/0/0" defaultValue={editing?.testHours ?? ""} key={`t-${editing?.id ?? "new"}`} /></div>
              <div className="field"><label>Xử lý&BC (T/E/L)</label><input name="reportHours" placeholder="0/0/0" defaultValue={editing?.reportHours ?? ""} key={`r-${editing?.id ?? "new"}`} /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit" className="btn-pri" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm"}</button>
              <button type="button" className="btn-line" onClick={() => { setShowForm(false); setEditing(null) }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div className="qs-box" id="qtp-scrollbox">
        <table className="rz-table" id="qtp-table">
          <thead>
            <tr>
              {editMode && (
                <th style={{ width: 32 }}>
                  <input type="checkbox" className="selall-chk" checked={filtered.length > 0 && filtered.every((r) => selected.includes(r.id))} onChange={(e) => setSelected(e.target.checked ? filtered.map((r) => r.id) : [])} />
                </th>
              )}
              <th>Số thứ tự</th><th>Mã bài</th><th>Tên bài thử</th><th>CB mẫu (T/E/L)</th><th>Set up (T/E/L)</th><th>Thử nghiệm (T/E/L)</th><th>Xử lý&BC (T/E/L)</th><th>Tổng (T/E/L)</th><th>CP nhân sự (VNĐ)</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="qtp-routing-body">
            {filtered.map((r, idx) => (
              <tr key={r.id}>
                {editMode && <td><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} /></td>}
                <td>{idx + 1}</td>
                <td>{r.testCode ?? "—"}</td>
                <td>{r.testName}</td>
                <td>{r.prepHours ?? "0/0/0"}</td>
                <td>{r.setupHours ?? "0/0/0"}</td>
                <td>{r.testHours ?? "0/0/0"}</td>
                <td>{r.reportHours ?? "0/0/0"}</td>
                <td>{sumHours(r)}</td>
                <td>{fmtVnd(costFor(r, rateConfig))}</td>
                <td><button className="btn-line" onClick={() => openEdit(r)}>Sửa</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && <div className="empty" id="qtp-empty">Chưa có định mức nhân sự nào.</div>}
      </div>
    </section>
  )
}

function parseTEL(s: string | null): [number, number, number] {
  if (!s) return [0, 0, 0]
  const parts = s.split("/").map((x) => Number(x) || 0)
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

function sumHours(r: Row) {
  const stages = [r.prepHours, r.setupHours, r.testHours, r.reportHours]
  let t = 0, e = 0, l = 0
  for (const s of stages) { const [a, b, c] = parseTEL(s); t += a; e += b; l += c }
  return `${t}/${e}/${l}`
}

function costFor(r: Row, cfg: { techRate: number; engRate: number; leadRate: number; overheadPct: number }) {
  const stages = [r.prepHours, r.setupHours, r.testHours, r.reportHours]
  let t = 0, e = 0, l = 0
  for (const s of stages) { const [a, b, c] = parseTEL(s); t += a; e += b; l += c }
  const base = t * cfg.techRate + e * cfg.engRate + l * cfg.leadRate
  return base * (1 + (cfg.overheadPct || 0) / 100)
}
