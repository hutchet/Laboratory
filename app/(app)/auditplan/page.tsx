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

  const plans = await db.auditPlan.findMany({ orderBy: { scheduledAt: "desc" }, include: { logs: true } })

  async function createPlan(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "auditplan", "create"))) return
    const title = String(formData.get("title") ?? "").trim()
    if (!title) return
    const scheduledAtRaw = String(formData.get("scheduledAt") ?? "")
    const status = String(formData.get("status") ?? STATUSES[0])
    await db.auditPlan.create({
      data: { title, status, scheduledAt: scheduledAtRaw ? new Date(scheduledAtRaw) : null },
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

  async function addLog(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "auditplan", "edit"))) return
    const auditPlanId = String(formData.get("auditPlanId") ?? "")
    const note = String(formData.get("note") ?? "").trim()
    if (!auditPlanId || !note) return
    await db.auditLog.create({ data: { auditPlanId, note } })
    revalidatePath("/auditplan")
  }

  async function deletePlan(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "auditplan", "delete"))) return
    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.auditLog.deleteMany({ where: { auditPlanId: id } })
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
              <div className="field"><label>Ngay du kien</label><input name="scheduledAt" type="date" /></div>
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

      {plans.map((p) => (
        <div key={p.id} className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{p.title}</strong>
              <div className="muted">{p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString("vi-VN") : "Chua co ngay"} - {p.status ?? "-"}</div>
            </div>
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
          </div>
          <div style={{ marginTop: 10 }}>
            <table>
              <thead><tr><th>Thoi gian</th><th>Ghi chu</th></tr></thead>
              <tbody>
                {p.logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{log.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {p.logs.length === 0 && <div className="empty">Chua co ghi nhan nao.</div>}
            {canEdit && (
              <form action={addLog} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input type="hidden" name="auditPlanId" value={p.id} />
                <input name="note" placeholder="Ghi chu moi" style={{ flex: 1 }} />
                <button type="submit" className="btn-line">Them ghi chu</button>
              </form>
            )}
          </div>
        </div>
      ))}
      {plans.length === 0 && <div className="empty">Chua co ke hoach nao.</div>}
    </section>
  )
}
