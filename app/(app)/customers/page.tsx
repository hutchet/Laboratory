import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function CustomersPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "customers", "create") : false
  const canDelete = userId ? await can(userId, "customers", "delete") : false

  const customers = await db.customer.findMany({ orderBy: { name: "asc" }, include: { quotes: true } })

  async function createCustomer(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "customers", "create"))) return
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const contact = String(formData.get("contact") ?? "") || null
    const phone = String(formData.get("phone") ?? "") || null
    await db.customer.create({ data: { name, contact, phone } })
    revalidatePath("/customers")
  }

  async function deleteCustomer(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "customers", "delete"))) return
    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.customer.delete({ where: { id } })
    revalidatePath("/customers")
  }

  return (
    <section>
      <div className="section-head"><h3>Khach hang</h3></div>
      {canCreate ? (
        <div className="card">
          <form action={createCustomer}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ten khach hang *</label><input name="name" required placeholder="Ten khach hang" /></div>
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Nguoi lien he</label><input name="contact" placeholder="Nguoi lien he" /></div>
              <div className="field"><label>Dien thoai</label><input name="phone" placeholder="Dien thoai" /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Them khach hang</button></div>
          </form>
        </div>
      ) : (
        <p className="muted">Ban khong co quyen tao khach hang moi.</p>
      )}

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ten</th><th>Lien he</th><th>Dien thoai</th><th>So bao gia</th>{canDelete && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.contact ?? "-"}</td>
                <td>{c.phone ?? "-"}</td>
                <td>{c.quotes.length}</td>
                {canDelete && (
                  <td>
                    <form action={deleteCustomer}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="btn-danger">Xoa</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && <div className="empty">Chua co khach hang nao.</div>}
      </div>
    </section>
  )
}
