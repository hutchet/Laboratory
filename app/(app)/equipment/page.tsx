import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function EquipmentPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "equipment", "create") : false
  const canEdit = userId ? await can(userId, "equipment", "edit") : false
  const canDelete = userId ? await can(userId, "equipment", "delete") : false

  const [centers, equipment, bookings] = await Promise.all([
    db.center.findMany({ orderBy: { name: "asc" } }),
    db.equipment.findMany({ orderBy: { name: "asc" }, include: { center: true } }),
    db.equipmentBooking.findMany({ orderBy: { startTime: "asc" }, include: { equipment: true, center: true } }),
  ])

  async function createCenter(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "equipment", "create"))) return

    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const address = String(formData.get("address") ?? "") || null
    await db.center.create({ data: { name, address } })
    revalidatePath("/equipment")
  }

  async function createEquipment(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "equipment", "create"))) return

    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const code = String(formData.get("code") ?? "") || null
    const centerId = String(formData.get("centerId") ?? "") || null
    await db.equipment.create({ data: { name, code, centerId } })
    revalidatePath("/equipment")
  }

  async function deleteEquipment(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "equipment", "delete"))) return

    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.equipmentBooking.deleteMany({ where: { equipmentId: id } })
    await db.equipment.delete({ where: { id } })
    revalidatePath("/equipment")
  }

  async function createBooking(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "equipment", "create"))) return

    const equipmentId = String(formData.get("equipmentId") ?? "")
    const startTimeRaw = String(formData.get("startTime") ?? "")
    const endTimeRaw = String(formData.get("endTime") ?? "")
    const bookedBy = String(formData.get("bookedBy") ?? "") || null
    if (!equipmentId || !startTimeRaw || !endTimeRaw) return

    const startTime = new Date(startTimeRaw)
    const endTime = new Date(endTimeRaw)
    if (endTime <= startTime) return

    // Kiem tra trung lich cho cung 1 thiet bi (chay tren server, khong the bi qua mat tu client)
    const overlap = await db.equipmentBooking.findFirst({
      where: {
        equipmentId,
        AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
      },
    })
    if (overlap) return

    const equipmentRow = await db.equipment.findUnique({ where: { id: equipmentId } })
    await db.equipmentBooking.create({
      data: { equipmentId, centerId: equipmentRow?.centerId ?? null, startTime, endTime, bookedBy },
    })
    revalidatePath("/equipment")
  }

  async function deleteBooking(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user?.id) return
    if (!(await can(session.user.id, "equipment", "delete"))) return

    const id = String(formData.get("id") ?? "")
    if (!id) return
    await db.equipmentBooking.delete({ where: { id } })
    revalidatePath("/equipment")
  }

  return (
    <main style={{ padding: 24, maxWidth: 960 }}>
      <h1>Equipment</h1>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18 }}>Trung tam (Centers)</h2>
        {canCreate && (
          <form action={createCenter} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input name="name" placeholder="Ten trung tam" required style={{ padding: 8, flex: "1 1 160px" }} />
            <input name="address" placeholder="Dia chi" style={{ padding: 8, flex: "1 1 200px" }} />
            <button type="submit" style={{ padding: "8px 16px" }}>Them trung tam</button>
          </form>
        )}
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {centers.map((c) => (
            <li key={c.id}>{c.name}{c.address ? ` — ${c.address}` : ""}</li>
          ))}
          {centers.length === 0 && <li style={{ color: "#888" }}>Chua co trung tam nao.</li>}
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18 }}>Thiet bi</h2>
        {canCreate && (
          <form action={createEquipment} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <input name="name" placeholder="Ten thiet bi" required style={{ padding: 8, flex: "1 1 160px" }} />
            <input name="code" placeholder="Ma thiet bi" style={{ padding: 8, flex: "1 1 120px" }} />
            <select name="centerId" style={{ padding: 8 }}>
              <option value="">-- Trung tam --</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" style={{ padding: "8px 16px" }}>Them thiet bi</button>
          </form>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: 8 }}>Ten</th>
              <th style={{ padding: 8 }}>Ma</th>
              <th style={{ padding: 8 }}>Trung tam</th>
              {canDelete && <th style={{ padding: 8 }}>Hanh dong</th>}
            </tr>
          </thead>
          <tbody>
            {equipment.map((e) => (
              <tr key={e.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 8 }}>{e.name}</td>
                <td style={{ padding: 8 }}>{e.code ?? "-"}</td>
                <td style={{ padding: 8 }}>{e.center?.name ?? "-"}</td>
                {canDelete && (
                  <td style={{ padding: 8 }}>
                    <form action={deleteEquipment}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {equipment.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co thiet bi nao.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ fontSize: 18 }}>Dat lich (Bookings)</h2>
        {canCreate && (
          <form action={createBooking} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <select name="equipmentId" required style={{ padding: 8 }}>
              <option value="">-- Thiet bi --</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
            <input name="startTime" type="datetime-local" required style={{ padding: 8 }} />
            <input name="endTime" type="datetime-local" required style={{ padding: 8 }} />
            <input name="bookedBy" placeholder="Nguoi dat" style={{ padding: 8, flex: "1 1 140px" }} />
            <button type="submit" style={{ padding: "8px 16px" }}>Dat lich</button>
          </form>
        )}
        <p style={{ color: "#888", fontSize: 13, marginTop: -4, marginBottom: 12 }}>
          He thong tu kiem tra trung lich tren server — neu thiet bi da co lich trong khoang thoi gian chon, viec dat lich se bi bo qua.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
              <th style={{ padding: 8 }}>Thiet bi</th>
              <th style={{ padding: 8 }}>Bat dau</th>
              <th style={{ padding: 8 }}>Ket thuc</th>
              <th style={{ padding: 8 }}>Nguoi dat</th>
              {canDelete && <th style={{ padding: 8 }}>Hanh dong</th>}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 8 }}>{b.equipment.name}</td>
                <td style={{ padding: 8 }}>{new Date(b.startTime).toLocaleString("vi-VN")}</td>
                <td style={{ padding: 8 }}>{new Date(b.endTime).toLocaleString("vi-VN")}</td>
                <td style={{ padding: 8 }}>{b.bookedBy ?? "-"}</td>
                {canDelete && (
                  <td style={{ padding: 8 }}>
                    <form action={deleteBooking}>
                      <input type="hidden" name="id" value={b.id} />
                      <button type="submit" style={{ color: "#b00" }}>Xoa</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#888" }}>Chua co lich dat nao.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}
