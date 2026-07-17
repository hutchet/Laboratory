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
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Quote</h1>

      {canCreate ? (
        <form action={createQuote} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <input name="title" placeholder="Ten bao gia" required style={{ padding: 8, flex: "1 1 200px" }} />
          <select name="customerId" style={{ padding: 8 }}>
            <option value="">-- Khach hang --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select name="status" style={{ padding: 8 }}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" style={{ padding: "8px 16px" }}>Tao bao gia</button>
        </form>
      ) : (
        <p style={{ color: "#888" }}>Ban khong co quyen tao bao gia moi.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Ten bao gia</th>
            <th style={{ padding: 8 }}>Khach hang</th>
            <th style={{ padding: 8 }}>Trang thai</th>
            <th style={{ padding: 8 }}>So muc</th>
            <th style={{ padding: 8 }}>Tong tien</th>
            <th style={{ padding: 8 }}>Hanh dong</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr key={q.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{q.title}</td>
              <td style={{ padding: 8 }}>{q.customer?.name ?? "-"}</td>
              <td style={{ padding: 8 }}>{q.status ?? "-"}</td>
              <td style={{ padding: 8 }}>{q.catalogItems.length}</td>
              <td style={{ padding: 8 }}>{(q.totalAmount ?? 0).toLocaleString("vi-VN")}</td>
              <td style={{ padding: 8, display: "flex", gap: 8 }}>
                <Link href={`/quote/${q.id}`}>Chi tiet</Link>
                {canDelete && (
                  <form action={deleteQuote}>
                    <input type="hidden" name="id" value={q.id} />
                    <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {quotes.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co bao gia nao.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
