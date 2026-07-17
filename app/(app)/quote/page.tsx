import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import Link from "next/link"

const STATUSES = ["Nhap", "Cho duyet", "Da duyet", "Tu choi"]

export default async function QuotePage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "quote", "create") : false
  const canDelete = userId ? await can(userId, "quote", "delete") : false

  const [quotes, customers] = await Promise.all([
    db.quote.findMany({ orderBy: { createdAt: "desc" }, include: { customer: true, catalogItems: true } }),
    db.customer.findMany({ orderBy: { name: "asc" } }),
  ])

  async function createQuote(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "quote", "create"))) return
    const title = String(formData.get("title") ?? "").trim()
    if (!title) return
    const customerId = String(formData.get("customerId") ?? "") || null
    const status = String(formData.get("status") ?? STATUSES[0])
    await db.quote.create({ data: { title, customerId, status, totalAmount: 0 } })
    revalidatePath("/quote")
  }

  async function deleteQuote(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "quote", "delete"))) return
    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.quoteCatalogItem.deleteMany({ where: { quoteId: id } })
    await db.quoteMatrixItem.deleteMany({ where: { quoteId: id } })
    await db.quotePersonnelItem.deleteMany({ where: { quoteId: id } })
    await db.quoteDepreciationItem.deleteMany({ where: { quoteId: id } })
    await db.quoteVariableItem.deleteMany({ where: { quoteId: id } })
    await db.quote.delete({ where: { id } })
    revalidatePath("/quote")
  }

  return (
    <section>
      <div className="section-head"><h3>Tat ca bao gia</h3></div>
      {canCreate ? (
        <div className="card">
          <form action={createQuote}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ten bao gia *</label><input name="title" required placeholder="Ten bao gia" /></div>
              <div className="field"><label>Khach hang</label>
                <select name="customerId">
                  <option value="">-- Khach hang --</option>
                  {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div className="field"><label>Trang thai</label>
                <select name="status">
                  {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Tao bao gia</button></div>
          </form>
        </div>
      ) : (
        <p className="muted">Ban khong co quyen tao bao gia moi.</p>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ten bao gia</th><th>Khach hang</th><th>Trang thai</th><th>So muc</th><th>Tong tien</th><th>Thao tac</th></tr></thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td>{q.title}</td>
                <td>{q.customer?.name ?? "-"}</td>
                <td>{q.status ?? "-"}</td>
                <td>{q.catalogItems.length}</td>
                <td>{(q.totalAmount ?? 0).toLocaleString("vi-VN")}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  <Link href={`/quote/${q.id}`} className="btn-line">Chi tiet</Link>
                  {canDelete && (
                    <form action={deleteQuote}>
                      <input type="hidden" name="id" value={q.id} />
                      <button type="submit" className="btn-danger">Xoa</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {quotes.length === 0 && <div className="empty">Chua co bao gia nao.</div>}
      </div>
    </section>
  )
}
