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

  const quote = await db.quote.findUnique({ where: { id }, include: { customer: true, catalogItems: true } })
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
    <section>
      <div className="section-head">
        <h3><Link href="/quote" className="btn-line">&larr; Danh sach</Link> &nbsp; {quote.title}</h3>
      </div>
      <div className="card">
        <p className="muted">Khach hang: {quote.customer?.name ?? "-"}</p>
        {canEdit ? (
          <form action={updateQuoteStatus} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>Trang thai:</span>
            <select name="status" defaultValue={quote.status ?? STATUSES[0]}>
              {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
            <button type="submit" className="btn-line">Luu</button>
          </form>
        ) : (
          <p>Trang thai: {quote.status ?? "-"}</p>
        )}
      </div>

      <div className="section-head"><h3>Danh muc bao gia</h3></div>
      {canEdit && (
        <div className="card">
          <form action={addItem}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ten muc *</label><input name="name" required placeholder="Ten muc" /></div>
              <div className="field"><label>Don gia</label><input name="price" type="number" min="0" step="0.01" /></div>
              <div className="field"><label>So luong</label><input name="quantity" type="number" min="1" defaultValue="1" /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Them muc</button></div>
          </form>
        </div>
      )}
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ten muc</th><th>Don gia</th><th>So luong</th><th>Thanh tien</th>{canEdit && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {quote.catalogItems.map((item) => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td>{(item.price ?? 0).toLocaleString("vi-VN")}</td>
                <td>{item.quantity ?? 1}</td>
                <td>{((item.price ?? 0) * (item.quantity ?? 1)).toLocaleString("vi-VN")}</td>
                {canEdit && (
                  <td>
                    <form action={removeItem}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <button type="submit" className="btn-danger">Xoa</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {quote.catalogItems.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={3} className="strong">Tong cong</td>
                <td className="strong">{(quote.totalAmount ?? 0).toLocaleString("vi-VN")}</td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          )}
        </table>
        {quote.catalogItems.length === 0 && <div className="empty">Chua co muc nao.</div>}
      </div>
    </section>
  )
}
