import { db } from "@/lib/db"

export default async function DashPage() {
  const [projectCount, taskCount, equipmentCount, quoteCount, customerCount, openTasks] = await Promise.all([
    db.project.count(),
    db.task.count(),
    db.equipment.count(),
    db.quote.count(),
    db.customer.count(),
    db.task.count({ where: { status: { not: "Hoan thanh" } } }),
  ])

  const recentTasks = await db.task.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { project: true } })

  const kpis = [
    { label: "Du an", value: projectCount },
    { label: "Cong viec", value: taskCount },
    { label: "Cong viec chua xong", value: openTasks },
    { label: "Thiet bi", value: equipmentCount },
    { label: "Bao gia", value: quoteCount },
    { label: "Khach hang", value: customerCount },
  ]

  return (
    <section>
      <div className="section-head"><h3>Tong quan</h3></div>
      <div className="kpis">
        {kpis.map((k) => (
          <div key={k.label} className="kcard">
            <div className="kv">{k.value}</div>
            <div className="kl">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="section-head"><h3>Cong viec gan day</h3></div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Cong viec</th><th>Du an</th><th>Trang thai</th><th>Han chot</th></tr></thead>
          <tbody>
            {recentTasks.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.project?.name ?? "-"}</td>
                <td>{t.status ?? "-"}</td>
                <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString("vi-VN") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recentTasks.length === 0 && <div className="empty">Chua co cong viec nao.</div>}
      </div>
    </section>
  )
}
