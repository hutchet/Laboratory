import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

const STATUSES = ["Chua bat dau", "Dang thuc hien", "Hoan thanh"]

export default async function ProjectsPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "projects", "create") : false
  const canEdit = userId ? await can(userId, "projects", "edit") : false
  const canDelete = userId ? await can(userId, "projects", "delete") : false

  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { tasks: true },
  })

  async function createProject(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "projects", "create"))) return

    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const status = String(formData.get("status") ?? STATUSES[0])
    const startDateRaw = String(formData.get("startDate") ?? "")
    const endDateRaw = String(formData.get("endDate") ?? "")

    await db.project.create({
      data: {
        name,
        status,
        startDate: startDateRaw ? new Date(startDateRaw) : null,
        endDate: endDateRaw ? new Date(endDateRaw) : null,
      },
    })
    revalidatePath("/projects")
  }

  async function updateStatus(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "projects", "edit"))) return

    const id = String(formData.get("id") ?? "")
    const status = String(formData.get("status") ?? "")
    if (!id || !status) return
    await db.project.update({ where: { id }, data: { status } })
    revalidatePath("/projects")
  }

  async function deleteProject(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "projects", "delete"))) return

    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.project.delete({ where: { id } })
    revalidatePath("/projects")
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Projects</h1>

      {canCreate ? (
        <form action={createProject} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <input name="name" placeholder="Ten du an" required style={{ padding: 8, flex: "1 1 200px" }} />
          <select name="status" style={{ padding: 8 }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input name="startDate" type="date" style={{ padding: 8 }} />
          <input name="endDate" type="date" style={{ padding: 8 }} />
          <button type="submit" style={{ padding: "8px 16px" }}>Them du an</button>
        </form>
      ) : (
        <p style={{ color: "#888" }}>Ban khong co quyen tao du an moi.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Ten du an</th>
            <th style={{ padding: 8 }}>Trang thai</th>
            <th style={{ padding: 8 }}>Bat dau</th>
            <th style={{ padding: 8 }}>Ket thuc</th>
            <th style={{ padding: 8 }}>So task</th>
            {(canEdit || canDelete) && <th style={{ padding: 8 }}>Hanh dong</th>}
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{p.name}</td>
              <td style={{ padding: 8 }}>{p.status ?? "-"}</td>
              <td style={{ padding: 8 }}>{p.startDate ? new Date(p.startDate).toLocaleDateString("vi-VN") : "-"}</td>
              <td style={{ padding: 8 }}>{p.endDate ? new Date(p.endDate).toLocaleDateString("vi-VN") : "-"}</td>
              <td style={{ padding: 8 }}>{p.tasks.length}</td>
              {(canEdit || canDelete) && (
                <td style={{ padding: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {canEdit && (
                      <form action={updateStatus} style={{ display: "flex", gap: 4 }}>
                        <input type="hidden" name="id" value={p.id} />
                        <select name="status" defaultValue={p.status ?? STATUSES[0]} style={{ padding: 4 }}>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button type="submit" style={{ padding: "4px 8px" }}>Luu</button>
                      </form>
                    )}
                    {canDelete && (
                      <form action={deleteProject}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                      </form>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co du an nao.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
