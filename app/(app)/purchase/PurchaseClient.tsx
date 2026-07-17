"use client"

import { useMemo, useState, useTransition } from "react"
import { savePurchase, deletePurchase, deleteAllPurchase, deleteManyPurchase } from "./actions"

type Item = {
  id: string
  name: string
  quantity: number | null
  cost: number | null
  status: string | null
  note: string | null
  lab: string | null
  supplier: string | null
  task: string | null
  jira: string | null
  pr: string | null
  po: string | null
  migo: string | null
  tinhtrang: string | null
  pic: string | null
  tfslink: string | null
}

function fmtVnd(n: number) {
  return n.toLocaleString("vi-VN")
}

function statusLabel(s: string | null) {
  if (s === "done") return "Hoàn thành"
  if (s === "ongoing") return "Đang triển khai"
  if (s === "delayed") return "Chậm"
  return "Chưa bắt đầu"
}

function statusColor(s: string | null) {
  if (s === "done") return "var(--green)"
  if (s === "ongoing") return "var(--amber)"
  if (s === "delayed") return "var(--red)"
  return "var(--muted)"
}

const UNGROUPED = "Chưa phân trung tâm"

export default function PurchaseClient({ items, canManage = true }: { items: Item[]; canManage?: boolean }) {
  const [editing, setEditing] = useState<Item | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [presetGroup, setPresetGroup] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [openGroup, setOpenGroup] = useState<string | null>(null)

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll(list: Item[]) {
    setSelected((prev) => (prev.size === list.length ? new Set() : new Set(list.map((it) => it.id))))
  }
  function onBulkDelete() {
    if (!selected.size) return
    if (!confirm(`Xóa ${selected.size} hạng mục đã chọn?`)) return
    const ids = Array.from(selected)
    startTransition(async () => { await deleteManyPurchase(ids); setSelected(new Set()) })
  }

  const total = items.length
  const totalValue = useMemo(() => items.reduce((sum, it) => sum + (it.cost ?? 0) * (it.quantity ?? 1), 0), [items])
  const ongoing = items.filter((i) => i.status === "ongoing").length
  const done = items.filter((i) => i.status === "done").length

  const groups = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const it of items) {
      const key = it.lab && it.lab.trim() ? it.lab.trim() : UNGROUPED
      const list = map.get(key) ?? []
      list.push(it)
      map.set(key, list)
    }
    return Array.from(map.entries())
      .map(([key, list]) => ({ key, list }))
      .sort((a, b) => b.list.length - a.list.length)
  }, [items])

  const activeList = openGroup ? groups.find((g) => g.key === openGroup)?.list ?? [] : []

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    if (!editing && presetGroup) formData.set("lab", presetGroup)
    startTransition(async () => { await savePurchase(formData); setShowForm(false); setEditing(null); setPresetGroup(null) })
  }
  function onDelete(id: string) {
    if (!confirm("Xóa hạng mục mua hàng này?")) return
    startTransition(async () => { await deletePurchase(id) })
  }
  function onDeleteAll() {
    if (!confirm("Xóa toàn bộ hạng mục mua hàng? Không thể hoàn tác.")) return
    startTransition(async () => { await deleteAllPurchase() })
  }
  function openGroupDetail(key: string) {
    setOpenGroup(key)
    setEditMode(false)
    setSelected(new Set())
  }
  function backToOverview() {
    setOpenGroup(null)
    setEditMode(false)
    setSelected(new Set())
  }

  return (
    <section id="page-purchase">
      <div className="grid kpis" style={{ marginBottom: 16 }}>
        <div className="kcard kb"><div className="v" id="pm-k-total">{total}</div><div className="l">Tổng hạng mục</div><div className="s">Toàn bộ hạng mục mua hàng theo dõi</div></div>
        <div className="kcard kg"><div className="v" id="pm-k-value">{fmtVnd(totalValue)}</div><div className="l">Tổng giá trị (đ)</div><div className="s">Tổng hợp giá trị các hạng mục</div></div>
        <div className="kcard kp"><div className="v" id="pm-k-ongoing">{ongoing}</div><div className="l">Đang triển khai</div><div className="s">Trạng thái On-going</div></div>
        <div className="kcard kr"><div className="v" id="pm-k-done">{done}</div><div className="l">Hoàn thành</div><div className="s">Trạng thái Done</div></div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 14, background: "var(--bg)" }}>
          <form action={onSubmit}>
            <div className="row">
              <div className="field" style={{ flex: 2 }}><label>Tên hạng mục</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field"><label>Số lượng</label><input type="number" name="quantity" min={1} defaultValue={editing?.quantity ?? 1} /></div>
              <div className="field"><label>Chi phí (đ/1 đơn vị)</label><input type="number" name="cost" min={0} defaultValue={editing?.cost ?? 0} /></div>
              <div className="field">
                <label>Trạng thái</label>
                <select name="status" defaultValue={editing?.status ?? "ongoing"}>
                  <option value="todo">Chưa bắt đầu</option>
                  <option value="ongoing">Đang triển khai</option>
                  <option value="delayed">Chậm</option>
                  <option value="done">Hoàn thành</option>
                </select>
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field"><label>Trung tâm / nhóm</label><input name="lab" defaultValue={editing?.lab ?? presetGroup ?? ""} placeholder="Ví dụ: Component Lab" /></div>
              <div className="field" style={{ flex: 1 }}><label>Nhà cung cấp</label><input name="supplier" defaultValue={editing?.supplier ?? ""} /></div>
              <div className="field"><label>Người phụ trách</label><input name="pic" defaultValue={editing?.pic ?? ""} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field"><label>Loại task</label><input name="task" defaultValue={editing?.task ?? ""} /></div>
              <div className="field"><label>Jira</label><input name="jira" defaultValue={editing?.jira ?? ""} /></div>
              <div className="field"><label>PR</label><input name="pr" defaultValue={editing?.pr ?? ""} /></div>
              <div className="field"><label>PO</label><input name="po" defaultValue={editing?.po ?? ""} /></div>
              <div className="field"><label>MIGO</label><input name="migo" defaultValue={editing?.migo ?? ""} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field" style={{ flex: 2 }}><label>Tình trạng chi tiết</label><input name="tinhtrang" defaultValue={editing?.tinhtrang ?? ""} /></div>
              <div className="field" style={{ flex: 1 }}><label>Liên kết TFS</label><input name="tfslink" defaultValue={editing?.tfslink ?? ""} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field" style={{ flex: 1 }}><label>Ghi chú</label><input name="note" defaultValue={editing?.note ?? ""} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <button type="submit" className="btn-pri" disabled={pending}>{editing ? "Lưu" : "Thêm"}</button>
              <button type="button" className="btn-line" onClick={() => { setShowForm(false); setEditing(null); setPresetGroup(null) }}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      {!openGroup && (
        <div id="pm-overview-wrap">
          <div id="pm-toolbar" style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 12 }}>
            {canManage && <button className="btn-pri" id="pm-add-btn" onClick={() => { setEditing(null); setPresetGroup(null); setShowForm(true) }}>+ Thêm hạng mục</button>}
            {canManage && <button className="btn-line" id="pm-delall-btn" style={{ color: "var(--red)" }} onClick={onDeleteAll}>Xóa toàn bộ</button>}
          </div>

          {items.length === 0 ? (
            <div id="pm-empty" className="empty" style={{ padding: 32, textAlign: "center" }}>Chưa có hạng mục mua hàng. Nhấn <b>+ Thêm hạng mục</b> để bắt đầu.</div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {groups.map(({ key, list }) => {
                const val = list.reduce((s, it) => s + (it.cost ?? 0) * (it.quantity ?? 1), 0)
                const gDone = list.filter((it) => it.status === "done").length
                const gOngoing = list.filter((it) => it.status === "ongoing").length
                const gDelayed = list.filter((it) => it.status === "delayed").length
                const progress = list.length ? Math.round((gDone * 100) / list.length) : 0
                const initial = key.trim().slice(0, 2).toUpperCase()
                return (
                  <div key={key} className="hub-card" onClick={() => openGroupDetail(key)}>
                    <div className="hub-top">
                      <div className="hub-icon">{initial}</div>
                      <div className="hub-title"><h4>{key}</h4><p>{list.length} hạng mục · {fmtVnd(val)} đ</p></div>
                      <span className="hub-arrow">›</span>
                    </div>
                    <div className="hub-tags">
                      <span className="hub-tag">{gDone} hoàn thành</span>
                      <span className="hub-tag">{gOngoing} đang triển khai</span>
                      {gDelayed > 0 && <span className="hub-tag" style={{ color: "var(--red)" }}>{gDelayed} chậm</span>}
                    </div>
                    <div className="plan-card-progress"><div className="line"><span>Tiến độ mua hàng</span><b>{progress}%</b></div><div className="bar"><i style={{ width: `${progress}%` }} /></div></div>
                    <div className="hub-stats">
                      <div className="hub-stat"><b>{list.length}</b><span>Hạng mục</span></div>
                      <div className="hub-stat" style={{ color: "var(--green)" }}><b>{gDone}</b><span>Hoàn thành</span></div>
                      <div className="hub-stat"><b>{gDone}/{list.length}</b><span>Tiến độ</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {openGroup && (
        <div id="pm-detail-shell">
          <div className="card center-detail-card">
            <div className="ch">
              <div>
                <h3 id="page-title-back" style={{ cursor: "pointer", color: "var(--pri)" }} onClick={backToOverview} title="Quay lại danh sách nhóm mua hàng">‹ {openGroup}</h3>
                <span>{activeList.length} hạng mục mua hàng</span>
              </div>
              <div className="center-detail-tools">
                {canManage && <button className="btn-pri" id="pm-add-in-group" onClick={() => { setEditing(null); setPresetGroup(openGroup); setShowForm(true) }}>+ Thêm hạng mục vào nhóm</button>}
                {canManage && <button className={editMode ? "btn-success" : "btn-line"} id="pm-edit-toggle" onClick={() => { setEditMode((v) => !v); setSelected(new Set()) }}>{editMode ? "Xong" : "Chỉnh sửa"}</button>}
                {canManage && editMode && (
                  <button className="btn-danger" id="pm-bulk-del" disabled={!selected.size} onClick={onBulkDelete}>Xóa đã chọn ({selected.size})</button>
                )}
              </div>
            </div>
            <div className="qs-box" id="pm-detail-scrollbox">
              <table className={editMode ? "rz-table tbl-editing" : "rz-table"} id="pm-detail-table">
                <thead>
                  <tr>
                    {editMode && <th><input type="checkbox" className="selall-chk" data-tbl="pm" checked={selected.size === activeList.length && activeList.length > 0} onChange={() => toggleAll(activeList)} aria-label="Chọn tất cả" /></th>}
                    <th>STT</th>
                    <th>Tên hạng mục</th>
                    <th>Thành tiền (đ)</th>
                    <th>Nhà cung cấp</th>
                    <th>Loại task</th>
                    <th>Jira</th>
                    <th>PR</th>
                    <th>PO</th>
                    <th>MIGO</th>
                    <th>Tình trạng</th>
                    <th>Người phụ trách</th>
                    <th>Trạng thái</th>
                    <th>TFS Link</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {activeList.map((it, idx) => (
                    <tr key={it.id}>
                      {editMode && <td><input type="checkbox" className="row-chk" data-tbl="pm" data-key={it.id} checked={selected.has(it.id)} onChange={() => toggleRow(it.id)} /></td>}
                      <td>{idx + 1}</td>
                      <td style={{ whiteSpace: "pre-line" }}><b>{it.name || "(Chưa đặt tên)"}</b></td>
                      <td style={{ whiteSpace: "nowrap" }}>{it.cost != null ? fmtVnd(it.cost * (it.quantity ?? 1)) : "—"}</td>
                      <td style={{ whiteSpace: "pre-line" }}>{it.supplier || "—"}</td>
                      <td>{it.task || "—"}</td>
                      <td>{it.jira ? <a href={it.jira.split("\n")[0]} target="_blank" rel="noopener">Link</a> : "—"}</td>
                      <td>{it.pr || "—"}</td>
                      <td>{it.po || "—"}</td>
                      <td>{it.migo || "—"}</td>
                      <td style={{ whiteSpace: "pre-line" }}>{it.tinhtrang || "—"}</td>
                      <td>{it.pic || "—"}</td>
                      <td><span className="badge" style={{ background: `${statusColor(it.status)}1a`, color: statusColor(it.status), padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{statusLabel(it.status)}</span></td>
                      <td>{it.tfslink && it.tfslink.startsWith("http") ? <a href={it.tfslink} target="_blank" rel="noopener">Link</a> : "—"}</td>
                      <td>
                        <button className="btn-line" onClick={() => { setEditing(it); setPresetGroup(null); setShowForm(true) }}>Sửa</button>
                        <button className="btn-line" onClick={() => onDelete(it.id)}>Xóa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {activeList.length === 0 && <div className="empty" style={{ padding: 32, textAlign: "center" }}>Nhóm này chưa có hạng mục nào.</div>}
          </div>
        </div>
      )}
    </section>
  )
}
