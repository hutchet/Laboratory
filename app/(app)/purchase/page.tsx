import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function PurchasePage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "purchase", "create") : false
  const canDelete = userId ? await can(userId, "purchase", "delete") : false

  const items = await db.purchaseItem.findMany({ orderBy: { id: "desc" } })
  const totalCost = items.reduce((sum, i) => sum + (i.cost ?? 0) * (i.quantity ?? 1), 0)

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
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Purchase</h1>

      {canCreate ? (
        <form action={createItem} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <input name="name" placeholder="Ten vat tu" required style={{ padding: 8, flex: "1 1 200px" }} />
          <input name="quantity" type="number" min="1" placeholder="So luong" defaultValue="1" style={{ padding: 8, width: 100 }} />
          <input name="cost" type="number" min="0" step="0.01" placeholder="Don gia" style={{ padding: 8, width: 140 }} />
          <button type="submit" style={{ padding: "8px 16px" }}>Them vat tu</button>
        </form>
      ) : (
        <p style={{ color: "#888" }}>Ban khong co quyen tao vat tu moi.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Ten vat tu</th>
            <th style={{ padding: 8 }}>So luong</th>
            <th style={{ padding: 8 }}>Don gia</th>
            <th style={{ padding: 8 }}>Thanh tien</th>
            {canDelete && <th style={{ padding: 8 }}>Hanh dong</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{i.name}</td>
              <td style={{ padding: 8 }}>{i.quantity ?? 1}</td>
              <td style={{ padding: 8 }}>{(i.cost ?? 0).toLocaleString("vi-VN")}</td>
              <td style={{ padding: 8 }}>{((i.cost ?? 0) * (i.quantity ?? 1)).toLocaleString("vi-VN")}</td>
              {canDelete && (
                <td style={{ padding: 8 }}>
                  <form action={deleteItem}>
                    <input type="hidden" name="id" value={i.id} />
                    <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                  </form>
                </td>
              )}
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co vat tu nao.</td>
            </tr>
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: 8, fontWeight: 700 }}>Tong cong</td>
              <td style={{ padding: 8, fontWeight: 700 }}>{totalCost.toLocaleString("vi-VN")}</td>
              {canDelete && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </main>
  )
}
