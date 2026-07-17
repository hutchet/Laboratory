import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function MembersPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "members", "create") : false
  const canEdit = userId ? await can(userId, "members", "edit") : false
  const canDelete = userId ? await can(userId, "members", "delete") : false

  const [members, roles] = await Promise.all([
    db.member.findMany({ orderBy: { name: "asc" } }),
    db.role.findMany({ orderBy: { name: "asc" } }),
  ])

  async function createMember(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "members", "create"))) return
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const email = String(formData.get("email") ?? "") || null
    const role = String(formData.get("role") ?? "") || null
    const phone = String(formData.get("phone") ?? "") || null
    await db.member.create({ data: { name, email, role, phone } })
    revalidatePath("/members")
  }

  async function deleteMember(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "members", "delete"))) return
    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.member.delete({ where: { id } })
    revalidatePath("/members")
  }

  return (
    <section>
      <div className="section-head"><h3>Thanh vien</h3></div>
      {canCreate ? (
        <div className="card">
          <form action={createMember}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ho ten *</label><input name="name" required placeholder="Ho ten" /></div>
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Email</label><input name="email" type="email" placeholder="Email" /></div>
              <div className="field"><label>Vai tro / Chuc vu</label><input name="role" placeholder="VD: Ky su" /></div>
              <div className="field"><label>Dien thoai</label><input name="phone" placeholder="Dien thoai" /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Them thanh vien</button></div>
          </form>
        </div>
      ) : (
        <p className="muted">Ban khong co quyen tao thanh vien moi.</p>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ho ten</th><th>Email</th><th>Vai tro</th><th>Dien thoai</th>{canDelete && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.email ?? "-"}</td>
                <td>{m.role ?? "-"}</td>
                <td>{m.phone ?? "-"}</td>
                {canDelete && (
                  <td>
                    <form action={deleteMember}>
                      <input type="hidden" name="id" value={m.id} />
                      <button type="submit" className="btn-danger">Xoa</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && <div className="empty">Chua co thanh vien nao.</div>}
      </div>

      <div className="section-head"><h3>Vai tro he thong (phan quyen)</h3></div>
      <div className="card">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {roles.map((r) => (<li key={r.id}>{r.name}</li>))}
        </ul>
        <p className="muted" style={{ marginTop: 8 }}>{canEdit ? "Ban co the gan vai tro he thong cho nguoi dung tai trang Cai dat." : ""}</p>
      </div>
    </section>
  )
}
