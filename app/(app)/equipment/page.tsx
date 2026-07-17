import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export default async function EquipmentPage() {
  const session = await auth()
  const userId = session?.user?.id

  const canCreate = userId ? await can(userId, "equipment", "create") : false
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
    const overlap = await db.equipmentBooking.findFirst({
      where: { equipmentId, AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }] },
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
    <section>
      <div className="section-head"><h3>Trung tam thu nghiem</h3></div>
      <div className="card">
        {canCreate && (
          <form action={createCenter}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ten trung tam *</label><input name="name" required placeholder="VD: Trung tam thu nghiem Pin" /></div>
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Dia chi</label><input name="address" placeholder="Dia chi" /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Them trung tam</button></div>
          </form>
        )}
        <ul style={{ margin: "12px 0 0", paddingLeft: 20 }}>
          {centers.map((c) => (<li key={c.id}>{c.name}{c.address ? ` - ${c.address}` : ""}</li>))}
          {centers.length === 0 && <li className="muted">Chua co trung tam nao.</li>}
        </ul>
      </div>

      <div className="section-head"><h3>Thiet bi</h3></div>
      <div className="card">
        {canCreate && (
          <form action={createEquipment}>
            <div className="row">
              <div className="field" style={{ flex: 2, minWidth: 200 }}><label>Ten thiet bi *</label><input name="name" required placeholder="VD: May do dien" /></div>
              <div className="field"><label>Ma thiet bi</label><input name="code" placeholder="Ma" /></div>
              <div className="field"><label>Trung tam</label>
                <select name="centerId">
                  <option value="">-- Trung tam --</option>
                  {centers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">+ Them thiet bi</button></div>
          </form>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Ten</th><th>Ma</th><th>Trung tam</th>{canDelete && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {equipment.map((e) => (
              <tr key={e.id}>
                <td>{e.name}</td>
                <td>{e.code ?? "-"}</td>
                <td>{e.center?.name ?? "-"}</td>
                {canDelete && (
                  <td>
                    <form action={deleteEquipment}>
                      <input type="hidden" name="id" value={e.id} />
                      <button type="submit" className="btn-danger">Xoa</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {equipment.length === 0 && <div className="empty">Chua co thiet bi nao.</div>}
      </div>

      <div className="section-head"><h3>Dat lich (Bookings)</h3></div>
      <div className="card">
        {canCreate && (
          <form action={createBooking}>
            <div className="row">
              <div className="field"><label>Thiet bi *</label>
                <select name="equipmentId" required>
                  <option value="">-- Thiet bi --</option>
                  {equipment.map((e) => (<option key={e.id} value={e.id}>{e.name}</option>))}
                </select>
              </div>
              <div className="field"><label>Bat dau *</label><input name="startTime" type="datetime-local" required /></div>
              <div className="field"><label>Ket thuc *</label><input name="endTime" type="datetime-local" required /></div>
              <div className="field"><label>Nguoi dat</label><input name="bookedBy" placeholder="Nguoi dat" /></div>
            </div>
            <div className="row" style={{ marginTop: 12 }}><button type="submit" className="btn-pri">Dat lich</button></div>
          </form>
        )}
        <p className="muted" style={{ marginTop: 8 }}>He thong tu kiem tra trung lich tren server, neu thiet bi da co lich trong khoang thoi gian chon, viec dat lich se bi bo qua.</p>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Thiet bi</th><th>Bat dau</th><th>Ket thuc</th><th>Nguoi dat</th>{canDelete && <th>Thao tac</th>}</tr></thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id}>
                <td>{b.equipment.name}</td>
                <td>{new Date(b.startTime).toLocaleString("vi-VN")}</td>
                <td>{new Date(b.endTime).toLocaleString("vi-VN")}</td>
                <td>{b.bookedBy ?? "-"}</td>
                {canDelete && (
                  <td>
                    <form action={deleteBooking}>
                      <input type="hidden" name="id" value={b.id} />
                      <button type="submit" className="btn-danger">Xoa</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {bookings.length === 0 && <div className="empty">Chua co lich dat nao.</div>}
      </div>
    </section>
  )
}
