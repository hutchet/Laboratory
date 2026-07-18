"use client"

import { useRef, useState, useTransition } from "react"
import { saveMember, deleteMember } from "./actions"
import { useColResize } from "../quote/useColResize"
import { useEscapeClose } from "@/lib/useEscapeClose"
import { CustomSelect } from "@/components/CustomSelect"

type MemberRow = {
  id: string
  name: string
  code: string | null
  email: string | null
  gender: string | null
  team: string | null
  accessRole: string | null
}

const ROLE_LABEL: Record<string, string> = { viewer: "Người xem", technician: "Kỹ thuật viên", manager: "Quản lý", admin: "Quản trị" }
const TEAM_OPTIONS = ["Sản phẩm", "Thiết kế", "Kỹ thuật", "Vận hành", "Kiểm định chất lượng", "Marketing", "Chiến lược"]

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase()
}

const MEM_AV_COLORS = ["#5b7bff","#e2665f","#2ab090","#e9963e","#9b6ff7","#3ba0c4"]
function memInitials(name: string) { const p = name.trim().split(/\s+/); return (p.length >= 2 ? p[0][0] + p[p.length-1][0] : name.slice(0,2)).toUpperCase() }
function memAvColor(name: string) { let h = 0; for (const c of name) h = (h*31 + c.charCodeAt(0)) & 0xffff; return MEM_AV_COLORS[h % MEM_AV_COLORS.length] }

export default function MembersClient({ members, canManage }: { members: MemberRow[]; canManage: boolean }) {
  const [editing, setEditing] = useState<MemberRow | null>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  useColResize(tableRef, 8) // 8 cols
  useEscapeClose(!!editing, () => setEditing(null))
  const [pending, startTransition] = useTransition()
  const admin = members.find((m) => m.accessRole === "admin") ?? members[0]

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => { await saveMember(formData); setEditing(null) })
  }
  function onDelete(id: string) {
    if (!confirm("Xoá thành viên này?")) return
    startTransition(async () => { await deleteMember(id) })
  }

  return (
    <section id="page-members">
      <div className="adminbar">
        <span className="av" id="adminbar-av">{admin ? initials(admin.name) : "--"}</span>
        <div><div style={{ fontWeight: 600, fontSize: 14 }} id="adminbar-nm">{admin?.name ?? "—"}</div><div style={{ fontSize: 12, color: "var(--muted)" }} id="adminbar-em">{admin?.email ?? "—"}</div></div>
        <span className="role">★ Quản trị viên</span>
      </div>
      {canManage && (
      <div className="card" style={{ marginBottom: 18 }}>
        <form action={onSubmit}>
          <input type="hidden" id="m-id" name="id" defaultValue={editing?.id ?? ""} />
          <div className="row">
            <div className="field" style={{ flex: 2, minWidth: 180 }}><label>Họ và tên *</label><input id="m-name" name="name" placeholder="VD: Nguyễn Văn A" defaultValue={editing?.name ?? ""} key={`n-${editing?.id ?? "new"}`} required /></div>
            <div className="field"><label>Mã nhân viên</label><input id="m-code" name="code" placeholder="VD: NV006" defaultValue={editing?.code ?? ""} key={`c-${editing?.id ?? "new"}`} /></div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}><label>Email</label><input id="m-email" name="email" type="email" placeholder="name@taskflow.com" defaultValue={editing?.email ?? ""} key={`e-${editing?.id ?? "new"}`} /></div>
            <div className="field"><label>Giới tính</label>
              <CustomSelect id="m-gender" name="gender" defaultValue={editing?.gender ?? "Nam"} key={`g-${editing?.id ?? "new"}`} options={[{ value: "Nam", label: "Nam" }, { value: "Nữ", label: "Nữ" }, { value: "Khác", label: "Khác" }]} />
            </div>
            <div className="field">
              <label>Nhóm</label>
              <input id="m-team" name="team" placeholder="VD: Kỹ thuật" list="team-list" defaultValue={editing?.team ?? ""} key={`t-${editing?.id ?? "new"}`} />
              <datalist id="team-list">{TEAM_OPTIONS.map((t) => (<option key={t}>{t}</option>))}</datalist>
            </div>
            <div className="field">
              <label>Vai trò truy cập</label>
              <CustomSelect id="m-admin" name="accessRole" defaultValue={editing?.accessRole ?? "viewer"} key={`r-${editing?.id ?? "new"}`} options={[{ value: "viewer", label: "Người xem" }, { value: "technician", label: "Kỹ thuật viên" }, { value: "manager", label: "Quản lý" }, { value: "admin", label: "Quản trị" }]} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }} data-perm="admin">
            <button type="submit" className="btn-pri" id="m-submit" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm thành viên"}</button>
            {editing && <button type="button" className="btn-line" id="m-cancel" onClick={() => setEditing(null)}>Hủy</button>}
          </div>
        </form>
      </div>
      )}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <div className="qs-box">
        <table className="rz-table tbl-editing" ref={tableRef}>
          <thead><tr><th>Số thứ tự</th><th>Họ và tên</th><th>Mã nhân viên</th><th>Email</th><th>Giới tính</th><th>Nhóm</th><th>Quyền</th><th>Thao tác</th></tr></thead>
          <tbody id="mbody">
            {members.map((m, i) => (
              <tr key={m.id}>
                <td>{i + 1}</td>
                <td>
                  <div className="person" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="av" style={{ width: 30, height: 30, fontSize: 11, background: memAvColor(m.name), borderRadius: "50%", display: "grid", placeItems: "center", color: "#fff", fontWeight: 600, flexShrink: 0 }}>{memInitials(m.name)}</span>
                    <b>{m.name}</b>
                  </div>
                </td>
                <td>{m.code ?? "—"}</td>
                <td>{m.email ?? "—"}</td>
                <td>
                  <span className={`gender ${{ 'Nam': 'g-nam', 'Nữ': 'g-nu' }[m.gender ?? ''] ?? 'g-khac'}`}>{m.gender ?? '—'}</span>
                </td>
                <td>{m.team ?? "—"}</td>
                <td>
                  <span className="adminbadge" style={{
                    background: m.accessRole === 'admin' ? 'var(--pri-soft)' : m.accessRole === 'manager' ? 'var(--green-soft)' : m.accessRole === 'technician' ? 'var(--amber-soft)' : 'var(--neutral-soft)',
                    color: m.accessRole === 'admin' ? 'var(--pri-d)' : m.accessRole === 'manager' ? 'var(--green)' : m.accessRole === 'technician' ? 'var(--amber)' : 'var(--muted)',
                    padding: '2px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 600
                  }}>{m.accessRole === 'admin' ? '★ ' : ''}{ROLE_LABEL[m.accessRole ?? "viewer"]}</span>
                </td>
                <td>
                  {canManage ? (
                    <div className="acts">
                      <button type="button" className="icon-act pri" title="Sửa" onClick={() => setEditing(m)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button type="button" className="icon-act del" title="Xoá" onClick={() => onDelete(m.id)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {members.length === 0 && <div className="empty" id="m-empty">Chưa có thành viên nào.</div>}
      </div>
    </section>
  )
}
