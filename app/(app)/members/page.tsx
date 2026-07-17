import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function MembersPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "members", "create") : false
  const canDelete = userId ? await can(userId, "members", "delete") : false

  const members = await db.member.findMany({ orderBy: { createdAt: "desc" } })

  async function createMember(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "members", "create"))) return

    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const role = String(formData.get("role") ?? "") || null
    const email = String(formData.get("email") ?? "") || null
    const phone = String(formData.get("phone") ?? "") || null

    await db.member.create({ data: { name, role, email, phone } })
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
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Members</h1>

      {canCreate ? (
        <form action={createMember} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <input name="name" placeholder="Ten" required style={{ padding: 8, flex: "1 1 160px" }} />
          <input name="role" placeholder="Vai tro (vd: technician)" style={{ padding: 8, flex: "1 1 160px" }} />
          <input name="email" type="email" placeholder="Email" style={{ padding: 8, flex: "1 1 160px" }} />
          <input name="phone" placeholder="So dien thoai" style={{ padding: 8, flex: "1 1 140px" }} />
          <button type="submit" style={{ padding: "8px 16px" }}>Them thanh vien</button>
        </form>
      ) : (
        <p style={{ color: "#888" }}>Ban khong co quyen tao thanh vien moi.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Ten</th>
            <th style={{ padding: 8 }}>Vai tro</th>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Dien thoai</th>
            {canDelete && <th style={{ padding: 8 }}>Hanh dong</th>}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{m.name}</td>
              <td style={{ padding: 8 }}>{m.role ?? "-"}</td>
              <td style={{ padding: 8 }}>{m.email ?? "-"}</td>
              <td style={{ padding: 8 }}>{m.phone ?? "-"}</td>
              {canDelete && (
                <td style={{ padding: 8 }}>
                  <form action={deleteMember}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                  </form>
                </td>
              )}
            </tr>
          ))}
          {members.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co thanh vien nao.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
