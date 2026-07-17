import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function CustomersPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "customers", "create") : false
  const canDelete = userId ? await can(userId, "customers", "delete") : false

  const customers = await db.customer.findMany({
    orderBy: { name: "asc" },
    include: { quotes: true },
  })

  async function createCustomer(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "customers", "create"))) return

    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const email = String(formData.get("email") ?? "") || null
    const phone = String(formData.get("phone") ?? "") || null
    const address = String(formData.get("address") ?? "") || null

    await db.customer.create({ data: { name, email, phone, address } })
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
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1>Customers</h1>

      {canCreate ? (
        <form action={createCustomer} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24, padding: 16, border: "1px solid #ddd", borderRadius: 8 }}>
          <input name="name" placeholder="Ten khach hang" required style={{ padding: 8, flex: "1 1 160px" }} />
          <input name="email" type="email" placeholder="Email" style={{ padding: 8, flex: "1 1 160px" }} />
          <input name="phone" placeholder="So dien thoai" style={{ padding: 8, flex: "1 1 140px" }} />
          <input name="address" placeholder="Dia chi" style={{ padding: 8, flex: "1 1 200px" }} />
          <button type="submit" style={{ padding: "8px 16px" }}>Them khach hang</button>
        </form>
      ) : (
        <p style={{ color: "#888" }}>Ban khong co quyen tao khach hang moi.</p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th style={{ padding: 8 }}>Ten</th>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Dien thoai</th>
            <th style={{ padding: 8 }}>Dia chi</th>
            <th style={{ padding: 8 }}>So bao gia</th>
            {canDelete && <th style={{ padding: 8 }}>Hanh dong</th>}
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td style={{ padding: 8 }}>{c.name}</td>
              <td style={{ padding: 8 }}>{c.email ?? "-"}</td>
              <td style={{ padding: 8 }}>{c.phone ?? "-"}</td>
              <td style={{ padding: 8 }}>{c.address ?? "-"}</td>
              <td style={{ padding: 8 }}>{c.quotes.length}</td>
              {canDelete && (
                <td style={{ padding: 8 }}>
                  <form action={deleteCustomer}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                  </form>
                </td>
              )}
            </tr>
          ))}
          {customers.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co khach hang nao.</td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  )
}
