import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

const STATUSES = ["Chua lam", "Dang lam", "Hoan thanh"]

export default async function TasksPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "tasks", "create") : false
  const canEdit = userId ? await can(userId, "tasks", "edit") : false
  const canDelete = userId ? await can(userId, "tasks", "delete") : false

  const [tasks, projects] = await Promise.all([
    db.task.findMany({ orderBy: { createdAt: "desc" }, include: { project: true } }),
    db.project.findMany({ orderBy: { name: "asc" } }),
  ])

  async function createTask(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "tasks", "create"))) return

    const title = String(formData.get("title") ?? "").trim()
    if (!title) return
    const projectId = String(formData.get("projectId") ?? "") || null
    const dueDateRaw = String(formData.get("dueDate") ?? "")
    const status = String(formData.get("status") ?? STATUSES[0])

    await db.task.create({
      data: { title, status, projectId, dueDate: dueDateRaw ? new Date(dueDateRaw) : null },
    })
    revalidatePath("/tasks")
  }

  async function updateStatus(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "tasks", "edit"))) return

    const id = String(formData.get("id") ?? "")
    const status = String(formData.get("status") ?? "")
    if (!id || !status) return
    await db.task.update({ where: { id }, data: { status } })
    revalidatePath("/tasks")
  }

  async function deleteTask(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "tasks", "delete"))) return

    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.task.delete({ where: { id } })
    revalidatePath("/tasks")
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Tasks</h1>

      {canCreate ? (
        <form action={createTask} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <input name="title" placeholder="Ten task" required style={{ padding: 8, flex: "1 1 200px" }} />
          <select name="projectId" style={{ padding: 8 }}>
            <option value="">-- Du an --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select name="status" style={{ padding: 8 }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input name="dueDate" type="date" style={{ padding: 8 }} />
          <button type="submit" style={{ padding: "8px 16px" }}>Them task</button>
        </form>
      ) : (
        <p style={{ color: "#888" }}>Ban khong co quyen tao task moi.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Ten task</th>
            <th style={{ padding: 8 }}>Du an</th>
            <th style={{ padding: 8 }}>Han</th>
            <th style={{ padding: 8 }}>Trang thai</th>
            {(canEdit || canDelete) && <th style={{ padding: 8 }}>Hanh dong</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{t.title}</td>
              <td style={{ padding: 8 }}>{t.project?.name ?? "-"}</td>
              <td style={{ padding: 8 }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString("vi-VN") : "-"}</td>
              <td style={{ padding: 8 }}>{t.status ?? "-"}</td>
              {(canEdit || canDelete) && (
                <td style={{ padding: 8 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    {canEdit && (
                      <form action={updateStatus} style={{ display: "flex", gap: 4 }}>
                        <input type="hidden" name="id" value={t.id} />
                        <select name="status" defaultValue={t.status ?? STATUSES[0]} style={{ padding: 4 }}>
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button type="submit" style={{ padding: "4px 8px" }}>Luu</button>
                      </form>
                    )}
                    {canDelete && (
                      <form action={deleteTask}>
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                      </form>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co task nao.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
