import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { notFound } from "next/navigation"
import Link from "next/link"

async function recalcTotal(quoteId: string) {
  const items = await db.quoteCatalogItem.findMany({ where: { quoteId } })
  const total = items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0)
  await db.quote.update({ where: { id: quoteId }, data: { totalAmount: total } })
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id

  const canEdit = userId ? await can(userId, "quote", "edit") : false
  const canDelete = userId ? await can(userId, "quote", "delete") : false

  const quote = await db.quote.findUnique({
    where: { id },
    include: { customer: true, catalogItems: true },
  })
  if (!quote) notFound()

  async function addItem(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "quote", "edit"))) return

    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const price = Number(formData.get("price") ?? 0) || 0
    const quantity = Number(formData.get("quantity") ?? 1) || 1

    await db.quoteCatalogItem.create({ data: { quoteId: id, name, price, quantity } })
    await recalcTotal(id)
    revalidatePath(`/quote/${id}`)
  }

  async function removeItem(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "quote", "edit"))) return

    const itemId = String(formData.get("itemId") ?? "")
    if (!itemId) return
    await db.quoteCatalogItem.delete({ where: { id: itemId } })
    await recalcTotal(id)
    revalidatePath(`/quote/${id}`)
  }

  async function updateQuoteStatus(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "quote", "edit"))) return

    const status = String(formData.get("status") ?? "")
    if (!status) return
    await db.quote.update({ where: { id }, data: { status } })
    revalidatePath(`/quote/${id}`)
  }

  const STATUSES = ["Nhap", "Cho duyet", "Da duyet", "Tu choi"]

  return (
    <main style={{ padding: 24, maxWidth: 800 }}>
      <Link href="/quote">&larr; Quay lai danh sach</Link>
      <h1>{quote.title}</h1>
      <p style={{ color: "#666" }}>Khach hang: {quote.customer?.name ?? "-"}</p>

      {canEdit ? (
        <form action={updateQuoteStatus} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 24 }}>
          <span>Trang thai:</span>
          <select name="status" defaultValue={quote.status ?? STATUSES[0]} style={{ padding: 6 }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: "6px 12px" }}>Luu</button>
        </form>
      ) : (
        <p>Trang thai: {quote.status ?? "-"}</p>
      )}

      <h2 style={{ fontSize: 18 }}>Danh muc bao gia</h2>
      {canEdit && (
        <form action={addItem} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <input name="name" placeholder="Ten muc" required style={{ padding: 8, flex: "1 1 200px" }} />
          <input name="price" type="number" min="0" step="0.01" placeholder="Don gia" style={{ padding: 8, width: 140 }} />
          <input name="quantity" type="number" min="1" placeholder="So luong" defaultValue="1" style={{ padding: 8, width: 100 }} />
          <button type="submit" style={{ padding: "8px 16px" }}>Them muc</button>
        </form>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Ten muc</th>
            <th style={{ padding: 8 }}>Don gia</th>
            <th style={{ padding: 8 }}>So luong</th>
            <th style={{ padding: 8 }}>Thanh tien</th>
            {canEdit && <th style={{ padding: 8 }}>Hanh dong</th>}
          </tr>
        </thead>
        <tbody>
          {quote.catalogItems.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{item.name}</td>
              <td style={{ padding: 8 }}>{(item.price ?? 0).toLocaleString("vi-VN")}</td>
              <td style={{ padding: 8 }}>{item.quantity ?? 1}</td>
              <td style={{ padding: 8 }}>{((item.price ?? 0) * (item.quantity ?? 1)).toLocaleString("vi-VN")}</td>
              {canEdit && (
                <td style={{ padding: 8 }}>
                  <form action={removeItem}>
                    <input type="hidden" name="itemId" value={item.id} />
                    <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                  </form>
                </td>
              )}
            </tr>
          ))}
          {quote.catalogItems.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co muc nao.</td>
            </tr>
          )}
        </tbody>
        {quote.catalogItems.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={3} style={{ padding: 8, fontWeight: 700 }}>Tong cong</td>
              <td style={{ padding: 8, fontWeight: 700 }}>{(quote.totalAmount ?? 0).toLocaleString("vi-VN")}</td>
              {canEdit && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </main>
  )
}
