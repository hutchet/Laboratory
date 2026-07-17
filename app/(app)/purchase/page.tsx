import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

const STATUSES = ["Yeu cau", "Da duyet", "Da mua", "Tu choi"]

export default async function PurchasePage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "purchase", "create") : false
  const canApprove = userId ? await can(userId, "purchase", "approve") : false
  const canDelete = userId ? await can(userId, "purchase", "delete") : false

  const items = await db.purchaseItem.findMany({ orderBy: { createdAt: "desc" } })

  async function createItem(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "purchase", "create"))) return
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const quantity = Number(formData.get("quantity") ?? 1) || 1
    const note = String(formData.get("note") ?? "") || null
    await db.purchaseItem.create({ data: { name, quantity, note, status: STATUSES[0] } })
    revalidatePath("/purchase")
  }

  async function updateStatus(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "purchase", "approve"))) return
    const id = String(formData.get("id") ?? "")
    const status = String(formData.get("status") ?? "")
    if (!id || !status) return
    await db.purchaseItem.update({ where: { id }, data: { status } })
    revalidatePath("/purchase")
  }

  async function deleteItem(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "purchase", "delete"))) return
    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.purchaseItem.delete({ where: { id } })
    revalidatePath("/purchase")
  }

  return (
    <section>
      <div className="section-head"><h3>Theo doi mua hang</h3></div>
      {canCreate ? (
        <div className="card">
          <form action={createItem}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ten mat hang *</label><input name="name" required placeholder="Ten mat hang" /></div>
              <div className="field"><label>So luong</label><input name="quantity" type="number" min="1" defaultValue="1" /></div>
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ghi chu</label><input name="note" placeholder="Ghi chu" /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Them yeu cau</button></div>
          </form>
        </div>
      ) : (
        <p className="muted">Ban khong co quyen tao yeu cau mua hang.</p>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ten mat hang</th><th>So luong</th><th>Ghi chu</th><th>Trang thai</th>{(canApprove || canDelete) && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.name}</td>
                <td>{it.quantity ?? 1}</td>
                <td>{it.note ?? "-"}</td>
                <td>{it.status ?? "-"}</td>
                {(canApprove || canDelete) && (
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {canApprove && (
                        <form action={updateStatus} style={{ display: "flex", gap: 4 }}>
                          <input type="hidden" name="id" value={it.id} />
                          <select name="status" defaultValue={it.status ?? STATUSES[0]}>
                            {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                          </select>
                          <button type="submit" className="btn-line">Luu</button>
                        </form>
                      )}
                      {canDelete && (
                        <form action={deleteItem}>
                          <input type="hidden" name="id" value={it.id} />
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
        {items.length === 0 && <div className="empty">Chua co yeu cau mua hang nao.</div>}
      </div>
    </section>
  )
}
