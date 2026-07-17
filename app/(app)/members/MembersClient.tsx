"use client"

import { useState, useTransition } from "react"
import { saveMember, deleteMember } from "./actions"
import { Perm } from "@/lib/rbac-client"

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

export default function MembersClient({ members }: { members: MemberRow[] }) {
  const [editing, setEditing] = useState<MemberRow | null>(null)
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
      <div className="card" style={{ marginBottom: 18 }}>
        <form action={onSubmit}>
          <input type="hidden" id="m-id" name="id" defaultValue={editing?.id ?? ""} />
          <div className="row">
            <div className="field" style={{ flex: 2, minWidth: 180 }}><label>Họ và tên *</label><input id="m-name" name="name" placeholder="VD: Nguyễn Văn A" defaultValue={editing?.name ?? ""} key={`n-${editing?.id ?? "new"}`} required /></div>
            <div className="field"><label>Mã nhân viên</label><input id="m-code" name="code" placeholder="VD: NV006" defaultValue={editing?.code ?? ""} key={`c-${editing?.id ?? "new"}`} /></div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}><label>Email</label><input id="m-email" name="email" type="email" placeholder="name@taskflow.com" defaultValue={editing?.email ?? ""} key={`e-${editing?.id ?? "new"}`} /></div>
            <div className="field"><label>Giới tính</label>
              <select id="m-gender" name="gender" defaultValue={editing?.gender ?? "Nam"} key={`g-${editing?.id ?? "new"}`}>
                <option value="Nam">Nam</option><option value="Nữ">Nữ</option><option value="Khác">Khác</option>
              </select>
            </div>
            <div className="field">
              <label>Nhóm</label>
              <input id="m-team" name="team" placeholder="VD: Kỹ thuật" list="team-list" defaultValue={editing?.team ?? ""} key={`t-${editing?.id ?? "new"}`} />
              <datalist id="team-list">{TEAM_OPTIONS.map((t) => (<option key={t}>{t}</option>))}</datalist>
            </div>
            <div className="field">
              <label>Vai trò truy cập</label>
              <select id="m-admin" name="accessRole" defaultValue={editing?.accessRole ?? "viewer"} key={`r-${editing?.id ?? "new"}`}>
                <option value="viewer">Người xem</option>
                <option value="technician">Kỹ thuật viên</option>
                <option value="manager">Quản lý</option>
                <option value="admin">Quản trị</option>
              </select>
            </div>
          </div>
          <Perm minPerm="admin">
          <div className="row" style={{ marginTop: 12 }} data-perm="admin">
            <button type="submit" className="btn-pri" id="m-submit" disabled={pending}>{editing ? "Lưu thay đổi" : "+ Thêm thành viên"}</button>
            {editing && <button type="button" className="btn-line" id="m-cancel" onClick={() => setEditing(null)}>Hủy</button>}
          </div>
          </Perm>
        </form>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="mt">
          <thead><tr><th>Số thứ tự</th><th>Họ và tên</th><th>Mã nhân viên</th><th>Email</th><th>Giới tính</th><th>Nhóm</th><th>Quyền</th><th>Thao tác</th></tr></thead>
          <tbody id="mbody">
            {members.map((m, i) => (
              <tr key={m.id}>
                <td>{i + 1}</td>
                <td>{m.name}</td>
                <td>{m.code ?? "—"}</td>
                <td>{m.email ?? "—"}</td>
                <td>{m.gender ?? "—"}</td>
                <td>{m.team ?? "—"}</td>
                <td>{ROLE_LABEL[m.accessRole ?? "viewer"]}</td>
                <td>
                  <Perm minPerm="admin">
                    <button className="btn-line" onClick={() => setEditing(m)}>Sửa</button>{" "}
                    <button className="btn-line" onClick={() => onDelete(m.id)}>Xoá</button>
                  </Perm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <div className="empty" id="m-empty">Chưa có thành viên nào.</div>}
      </div>
    </section>
  )
}
