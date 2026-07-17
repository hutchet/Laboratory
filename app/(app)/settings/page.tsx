import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function SettingsPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canEdit = userId ? await can(userId, "settings", "edit") : false

  const [users, roles] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" }, include: { userRoles: { include: { role: true } } } }),
    db.role.findMany({ orderBy: { name: "asc" } }),
  ])

  async function assignRole(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "settings", "edit"))) return

    const targetUserId = String(formData.get("userId") ?? "")
    const roleId = String(formData.get("roleId") ?? "")
    if (!targetUserId || !roleId) return

    await db.userRole.upsert({
      where: { userId_roleId: { userId: targetUserId, roleId } },
      update: {},
      create: { userId: targetUserId, roleId },
    })
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

    await db.userRole.delete({ where: { userId_roleId: { userId: targetUserId, roleId } } })
    revalidatePath("/settings")
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Settings — Nguoi dung &amp; Phan quyen</h1>

      {!canEdit && <p style={{ color: "#888" }}>Ban chi co the xem, khong co quyen sua phan quyen.</p>}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Ten</th>
            <th style={{ padding: 8 }}>Vai tro hien tai</th>
            {canEdit && <th style={{ padding: 8 }}>Gan / go vai tro</th>}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{u.email}</td>
              <td style={{ padding: 8 }}>{u.name ?? "-"}</td>
              <td style={{ padding: 8 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {u.userRoles.map((ur) => (
                    <span key={ur.roleId} style={{ display: "inline-flex", gap: 4, alignItems: "center", background: "#f0f0f0", borderRadius: 12, padding: "2px 8px", fontSize: 13 }}>
                      {ur.role.name}
                      {canEdit && (
                        <form action={removeRole}>
                          <input type="hidden" name="userId" value={u.id} />
                          <input type="hidden" name="roleId" value={ur.roleId} />
                          <button type="submit" style={{ color: "#b00", border: "none", background: "none", cursor: "pointer" }}>×</button>
                        </form>
                      )}
                    </span>
                  ))}
                  {u.userRoles.length === 0 && <span style={{ color: "#999" }}>Chua co vai tro</span>}
                </div>
              </td>
              {canEdit && (
                <td style={{ padding: 8 }}>
                  <form action={assignRole} style={{ display: "flex", gap: 6 }}>
                    <input type="hidden" name="userId" value={u.id} />
                    <select name="roleId" style={{ padding: 4 }}>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <button type="submit" style={{ padding: "4px 10px" }}>Gan</button>
                  </form>
                </td>
              )}
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co nguoi dung nao.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
