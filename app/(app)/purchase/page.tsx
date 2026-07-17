import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function PurchasePage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "purchase", "create") : false
  const canEdit = userId ? await can(userId, "purchase", "edit") : false
  const canDelete = userId ? await can(userId, "purchase", "delete") : false

  const items = await db.purchaseItem.findMany({ orderBy: { name: "asc" } })
  const totalCost = items.reduce((sum, it) => sum + (it.cost ?? 0) * (it.quantity ?? 1), 0)

  async function createItem(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "purchase", "create"))) return
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const quantity = Number(formData.get("quantity") ?? 1) || 1
    const cost = Number(formData.get("cost") ?? 0) || 0
    await db.purchaseItem.create({ data: { name, quantity, cost } })
    revalidatePath("/purchase")
  }

  async function updateItem(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "purchase", "edit"))) return
    const id = String(formData.get("id") ?? "")
    if (!id) return
    const quantity = Number(formData.get("quantity") ?? 1) || 1
    const cost = Number(formData.get("cost") ?? 0) || 0
    await db.purchaseItem.update({ where: { id }, data: { quantity, cost } })
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
              <div className="field"><label>Chi phi (don gia)</label><input name="cost" type="number" min="0" step="0.01" /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Them yeu cau</button></div>
          </form>
        </div>
      ) : (
        <p className="muted">Ban khong co quyen tao yeu cau mua hang.</p>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ten mat hang</th><th>So luong</th><th>Chi phi</th><th>Thanh tien</th>{(canEdit || canDelete) && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.name}</td>
                <td>{it.quantity ?? 1}</td>
                <td>{(it.cost ?? 0).toLocaleString("vi-VN")}</td>
                <td>{((it.cost ?? 0) * (it.quantity ?? 1)).toLocaleString("vi-VN")}</td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {canEdit && (
                        <form action={updateItem} style={{ display: "flex", gap: 4 }}>
                          <input type="hidden" name="id" value={it.id} />
                          <input name="quantity" type="number" min="1" defaultValue={it.quantity ?? 1} style={{ width: 70 }} />
                          <input name="cost" type="number" min="0" step="0.01" defaultValue={it.cost ?? 0} style={{ width: 100 }} />
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
          {items.length > 0 && (
            <tfoot>
              <tr><td colSpan={3} className="strong">Tong chi phi</td><td className="strong">{totalCost.toLocaleString("vi-VN")}</td>{(canEdit || canDelete) && <td />}</tr>
            </tfoot>
          )}
        </table>
        {items.length === 0 && <div className="empty">Chua co yeu cau mua hang nao.</div>}
      </div>
    </section>
  )
}
