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
    <section>
      <div className="section-head"><h3>Bao cao</h3></div>
      {canCreate ? (
        <div className="card">
          <form action={createReport}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ten bao cao *</label><input name="title" required placeholder="Ten bao cao" /></div>
            </div>
            <div className="row"><div className="field" style={{ width: "100%" }}><label>Noi dung</label><textarea name="content" rows={4} placeholder="Noi dung bao cao" /></div></div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Tao bao cao</button></div>
          </form>
        </div>
      ) : (
        <p className="muted">Ban khong co quyen tao bao cao moi.</p>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ten bao cao</th><th>Noi dung</th><th>Ngay tao</th>{canDelete && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td>{r.content ?? "-"}</td>
                <td>{new Date(r.createdAt).toLocaleDateString("vi-VN")}</td>
                {canDelete && (
                  <td>
                    <form action={deleteReport}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" className="btn-danger">Xoa</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {reports.length === 0 && <div className="empty">Chua co bao cao nao.</div>}
      </div>
    </section>
  )
}
