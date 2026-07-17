"use client"

import { useState, useTransition } from "react"
import { saveMember, deleteMember } from "./actions"

type Row = { id: string; name: string; code: string | null; email: string | null; gender: string | null; team: string | null; accessRole: string | null }

export default function MembersClient({ members }: { members: Row[] }) {
  const [editing, setEditing] = useState<Row | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    if (editing) formData.set("id", editing.id)
    startTransition(async () => {
      await saveMember(formData)
      setShowForm(false)
      setEditing(null)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoa thanh vien nay?")) return
    startTransition(async () => { await deleteMember(id) })
  }

  return (
    <section id="page-members">
      <div className="adminbar">
        <h2>Thanh vien</h2>
        <button className="btn-pri" onClick={() => { setEditing(null); setShowForm(true) }}>+ Them thanh vien</button>
      </div>

      {showForm && (
        <div className="card">
          <form action={onSubmit}>
            <div className="row">
              <div className="field"><label>Ho ten</label><input name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="field"><label>Ma nhan vien</label><input name="code" defaultValue={editing?.code ?? ""} /></div>
              <div className="field"><label>Email</label><input name="email" defaultValue={editing?.email ?? ""} /></div>
            </div>
            <div className="row">
              <div className="field">
                <label>Gioi tinh</label>
                <select name="gender" defaultValue={editing?.gender ?? ""}>
                  <option value="">--</option>
                  <option value="nam">Nam</option>
                  <option value="nu">Nu</option>
                </select>
              </div>
              <div className="field"><label>Nhom</label><input name="team" defaultValue={editing?.team ?? ""} /></div>
              <div className="field">
                <label><input type="checkbox" name="admin" defaultChecked={editing?.accessRole === "admin"} /> Quyen quan tri</label>
              </div>
            </div>
            <div className="row">
              <button className="btn-pri" type="submit" disabled={pending}>Luu</button>
              <button className="btn-line" type="button" onClick={() => setShowForm(false)}>Huy</button>
            </div>
          </form>
        </div>
      )}

      <table className="mt">
        <thead>
          <tr><th>STT</th><th>Ho ten</th><th>Ma NV</th><th>Email</th><th>Gioi tinh</th><th>Nhom</th><th>Quyen</th><th>Thao tac</th></tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={m.id}>
              <td>{i + 1}</td>
              <td>{m.name}</td>
              <td>{m.code ?? "-"}</td>
              <td>{m.email ?? "-"}</td>
              <td>{m.gender === "nam" ? "Nam" : m.gender === "nu" ? "Nu" : "-"}</td>
              <td>{m.team ?? "-"}</td>
              <td>{m.accessRole === "admin" ? "Quan tri" : "Thanh vien"}</td>
              <td>
                <button className="btn-line" onClick={() => { setEditing(m); setShowForm(true) }}>Sua</button>
                <button className="btn-line" onClick={() => onDelete(m.id)}>Xoa</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {members.length === 0 && <div className="empty">Chua co thanh vien nao.</div>}
    </section>
  )
}
