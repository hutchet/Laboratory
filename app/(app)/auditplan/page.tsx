import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

const STATUSES = ["Chua bat dau", "Dang thuc hien", "Hoan thanh"]

export default async function AuditPlanPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "auditplan", "create") : false
  const canEdit = userId ? await can(userId, "auditplan", "edit") : false
  const canDelete = userId ? await can(userId, "auditplan", "delete") : false

  const plans = await db.auditPlan.findMany({
    orderBy: { scheduledAt: "asc" },
    include: { logs: { orderBy: { createdAt: "desc" } } },
  })

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
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Audit Plan</h1>

      {canCreate ? (
        <form action={createPlan} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <input name="title" placeholder="Ten ke hoach audit" required style={{ padding: 8, flex: "1 1 200px" }} />
          <input name="scheduledAt" type="date" style={{ padding: 8 }} />
          <select name="status" style={{ padding: 8 }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: "8px 16px" }}>Them ke hoach</button>
        </form>
      ) : (
        <p style={{ color: "#888" }}>Ban khong co quyen tao ke hoach moi.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {plans.map((p) => (
          <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.title}</div>
                <div style={{ color: "#666", fontSize: 13 }}>
                  {p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString("vi-VN") : "Chua co ngay"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {canEdit ? (
                  <form action={updateStatus} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="id" value={p.id} />
                    <select name="status" defaultValue={p.status ?? STATUSES[0]} style={{ padding: 4 }}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button type="submit" style={{ padding: "4px 8px" }}>Luu</button>
                  </form>
                ) : (
                  <span>{p.status ?? "-"}</span>
                )}
                {canDelete && (
                  <form action={deletePlan}>
                    <input type="hidden" name="id" value={p.id} />
                    <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                  </form>
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>Nhat ky:</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {p.logs.map((l) => (
                  <li key={l.id} style={{ fontSize: 14 }}>
                    {l.note} <span style={{ color: "#999" }}>({new Date(l.createdAt).toLocaleString("vi-VN")})</span>
                  </li>
                ))}
                {p.logs.length === 0 && <li style={{ color: "#999" }}>Chua co nhat ky.</li>}
              </ul>
              {canEdit && (
                <form action={addLog} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input type="hidden" name="auditPlanId" value={p.id} />
                  <input name="note" placeholder="Ghi chu moi" style={{ padding: 6, flex: 1 }} />
                  <button type="submit" style={{ padding: "6px 12px" }}>Them</button>
                </form>
              )}
            </div>
          </div>
        ))}
        {plans.length === 0 && <p style={{ color: "#888", textAlign: "center" }}>Chua co ke hoach audit nao.</p>}
      </div>
    </main>
  )
}
