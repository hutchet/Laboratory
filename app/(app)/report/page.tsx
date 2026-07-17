import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function ReportPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "report", "create") : false
  const canDelete = userId ? await can(userId, "report", "delete") : false

  const reports = await db.report.findMany({ orderBy: { createdAt: "desc" } })

  async function createReport(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "report", "create"))) return

    const title = String(formData.get("title") ?? "").trim()
    if (!title) return
    const content = String(formData.get("content") ?? "") || null

    await db.report.create({ data: { title, content } })
    revalidatePath("/report")
  }

  async function deleteReport(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "report", "delete"))) return

    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.report.delete({ where: { id } })
    revalidatePath("/report")
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Report</h1>

      {canCreate ? (
        <form action={createReport} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <input name="title" placeholder="Tieu de bao cao" required style={{ padding: 8 }} />
          <textarea name="content" placeholder="Noi dung" rows={3} style={{ padding: 8 }} />
          <button type="submit" style={{ padding: "8px 16px", alignSelf: "flex-start" }}>Them bao cao</button>
        </form>
      ) : (
        <p style={{ color: "#888" }}>Ban khong co quyen tao bao cao moi.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {reports.map((r) => (
          <li key={r.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{r.title}</div>
                <div style={{ color: "#666", fontSize: 13 }}>{new Date(r.createdAt).toLocaleString("vi-VN")}</div>
                {r.content && <p style={{ marginTop: 8 }}>{r.content}</p>}
              </div>
              {canDelete && (
                <form action={deleteReport}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                </form>
              )}
            </div>
          </li>
        ))}
        {reports.length === 0 && <li style={{ color: "#888", textAlign: "center", padding: 16 }}>Chua co bao cao nao.</li>}
      </ul>
    </main>
  )
}
