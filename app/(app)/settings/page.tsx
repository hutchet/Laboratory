import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function SettingsPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canEdit = userId ? await can(userId, "settings", "edit") : false

  const [users, roles, userRoles] = await Promise.all([
    db.user.findMany({ orderBy: { email: "asc" } }),
    db.role.findMany({ orderBy: { name: "asc" } }),
    db.userRole.findMany({ include: { role: true } }),
  ])

  const rolesByUser = new Map<string, string[]>()
  for (const ur of userRoles) {
    const list = rolesByUser.get(ur.userId) ?? []
    list.push(ur.role.name)
    rolesByUser.set(ur.userId, list)
  }

  async function assignRole(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "settings", "edit"))) return
    const targetUserId = String(formData.get("userId") ?? "")
    const roleId = String(formData.get("roleId") ?? "")
    if (!targetUserId || !roleId) return
    const existing = await db.userRole.findFirst({ where: { userId: targetUserId, roleId } })
    if (!existing) {
      await db.userRole.create({ data: { userId: targetUserId, roleId } })
    }
    revalidatePath("/settings")
  }

  async function removeRole(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "settings", "edit"))) return
    const targetUserId = String(formData.get("userId") ?? "")
    const roleId = String(formData.get("roleId") ?? "")
    if (!targetUserId || !roleId) return
    await db.userRole.deleteMany({ where: { userId: targetUserId, roleId } })
    revalidatePath("/settings")
  }

  return (
    <section>
      <div className="section-head"><h3>Cai dat he thong</h3></div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Email</th><th>Ten</th><th>Vai tro</th>{canEdit && <th>Gan / Go vai tro</th>}</tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.name ?? "-"}</td>
                <td>{(rolesByUser.get(u.id) ?? []).join(", ") || "-"}</td>
                {canEdit && (
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <form action={assignRole} style={{ display: "flex", gap: 4 }}>
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="roleId">
                          {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                        </select>
                        <button type="submit" className="btn-line">Gan</button>
                      </form>
                      <form action={removeRole} style={{ display: "flex", gap: 4 }}>
                        <input type="hidden" name="userId" value={u.id} />
                        <select name="roleId">
                          {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                        </select>
                        <button type="submit" className="btn-danger">Go</button>
                      </form>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <div className="empty">Chua co nguoi dung nao.</div>}
      </div>
      {!canEdit && <p className="muted">Ban khong co quyen chinh sua vai tro nguoi dung.</p>}
    </section>
  )
}
