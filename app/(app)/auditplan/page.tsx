import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

const STATUSES = ["Lap ke hoach", "Dang thuc hien", "Hoan thanh"]

export default async function AuditPlanPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "auditplan", "create") : false
  const canEdit = userId ? await can(userId, "auditplan", "edit") : false
  const canDelete = userId ? await can(userId, "auditplan", "delete") : false

  const plans = await db.auditPlan.findMany({ orderBy: { createdAt: "desc" } })

  async function createPlan(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "auditplan", "create"))) return
    const title = String(formData.get("title") ?? "").trim()
    if (!title) return
    const scheduledDateRaw = String(formData.get("scheduledDate") ?? "")
    const status = String(formData.get("status") ?? STATUSES[0])
    await db.auditPlan.create({
      data: { title, status, scheduledDate: scheduledDateRaw ? new Date(scheduledDateRaw) : null },
    })
    revalidatePath("/auditplan")
  }

  async function updateStatus(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "auditplan", "edit"))) return
    const id = String(formData.get("id") ?? "")
    const status = String(formData.get("status") ?? "")
    if (!id || !status) return
    await db.auditPlan.update({ where: { id }, data: { status } })
    revalidatePath("/auditplan")
  }

  async function deletePlan(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "auditplan", "delete"))) return
    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.auditPlan.delete({ where: { id } })
    revalidatePath("/auditplan")
  }

  return (
    <section>
      <div className="section-head"><h3>Ke hoach kiem tra / danh gia</h3></div>
      {canCreate ? (
        <div className="card">
          <form action={createPlan}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ten ke hoach *</label><input name="title" required placeholder="Ten ke hoach" /></div>
              <div className="field"><label>Ngay du kien</label><input name="scheduledDate" type="date" /></div>
              <div className="field"><label>Trang thai</label>
                <select name="status">
                  {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Them ke hoach</button></div>
          </form>
        </div>
      ) : (
        <p className="muted">Ban khong co quyen tao ke hoach moi.</p>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ten ke hoach</th><th>Ngay du kien</th><th>Trang thai</th>{(canEdit || canDelete) && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td>{p.title}</td>
                <td>{p.scheduledDate ? new Date(p.scheduledDate).toLocaleDateString("vi-VN") : "-"}</td>
                <td>{p.status ?? "-"}</td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {canEdit && (
                        <form action={updateStatus} style={{ display: "flex", gap: 4 }}>
                          <input type="hidden" name="id" value={p.id} />
                          <select name="status" defaultValue={p.status ?? STATUSES[0]}>
                            {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                          </select>
                          <button type="submit" className="btn-line">Luu</button>
                        </form>
                      )}
                      {canDelete && (
                        <form action={deletePlan}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="btn-danger">Xoa</button>
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {plans.length === 0 && <div className="empty">Chua co ke hoach nao.</div>}
      </div>
    </section>
  )
}
