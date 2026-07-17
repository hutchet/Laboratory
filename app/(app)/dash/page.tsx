import { db } from "@/lib/db"

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "d"
}

export default async function DashPage() {
  const tasks = await db.task.findMany({ include: { project: true } })
  const projects = await db.project.findMany({ include: { tasks: true } })
  const customers = await db.customer.count()
  const quotes = await db.quote.findMany({ include: { catalogItems: true } })
  const equipment = await db.equipment.findMany()
  const samples = await db.sample.findMany()
  const testItems = await db.testItem.findMany()

  const now = new Date()
  const totalTasks = tasks.length
  const tasksWithProject = tasks.filter((t) => t.projectId).length
  const kUtil = totalTasks ? Math.round((tasksWithProject / totalTasks) * 100) : 0
  const activeTasks = tasks.filter((t) => t.status !== "done")
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "done")
  const riskyProjects = projects.filter((p) => p.tasks.some((t) => t.dueDate && t.dueDate < now && t.status !== "done"))
  const spotlight = riskyProjects[0] ?? projects[0]

  const upcoming = tasks
    .filter((t) => t.dueDate && t.dueDate >= now && t.status !== "done")
    .sort((a, b) => (a.dueDate!.getTime() - b.dueDate!.getTime()))
    .slice(0, 6)

  const doing = tasks.filter((t) => t.status === "doing").length
  const done = tasks.filter((t) => t.status === "done").length
  const overdueCount = overdueTasks.length
  const pct = (n: number) => (totalTasks ? Math.round((n / totalTasks) * 100) : 0)

  const workloadMap: Record<string, number> = {}
  for (const t of activeTasks) {
    const key = t.assigneeId || "Chua gan"
    workloadMap[key] = (workloadMap[key] || 0) + 1
  }
  const workload = Object.entries(workloadMap).sort((a, b) => b[1] - a[1]).slice(0, 6)

  const pHigh = tasks.filter((t) => t.priority === "high").length
  const pMed = tasks.filter((t) => t.priority === "med").length
  const pLow = tasks.filter((t) => t.priority === "low").length

  const withValue = projects.filter((p) => (p.value ?? 0) > 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  const pvdTotal = withValue.reduce((s, p) => s + (p.value ?? 0), 0)
  const leaderPct = pvdTotal ? Math.round(((withValue[0]?.value ?? 0) / pvdTotal) * 100) : 0

  const samplesTesting = samples.filter((s) => s.status === "testing").length
  const planProgressAvg = testItems.length ? Math.round(testItems.reduce((s, i) => s + (i.progress ?? 0), 0) / testItems.length) : 0
  const quoteValue = quotes.reduce((s, q) => s + (q.totalAmount ?? 0), 0)
  const quoteItemCount = quotes.reduce((s, q) => s + q.catalogItems.length, 0)

  const eqTotal = equipment.length
  const eqReady = equipment.filter((e) => e.status === "ready").length
  let eqSoon = 0
  let eqOverdue = 0
  for (const e of equipment) {
    if (!e.calLast || !e.calInterval) continue
    const due = new Date(e.calLast)
    due.setMonth(due.getMonth() + e.calInterval)
    if (due < now) eqOverdue++
    else if (due.getTime() - now.getTime() <= 30 * 86400000) eqSoon++
  }

  const top3Overdue = overdueTasks.slice(0, 3)

  return (
    <section id="page-dash">
      <div className="grid kpis">
        <div className="kcard kb">
          <div className="l">Du an/noi bo</div>
          <div className="v">{kUtil}%</div>
          <div className="s">theo du an</div>
        </div>
        <div className="kcard kg">
          <div className="l">Cong viec dang hoat dong</div>
          <div className="v">{activeTasks.length}</div>
          <div className="s">chua hoan thanh</div>
        </div>
        <div className="kcard kr">
          <div className="l">Du an co rui ro</div>
          <div className="v">{riskyProjects.length}</div>
          <div className="s">can chu y</div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><h3>Cong viec sap den han</h3></div>
        <div id="due-bars">
          {upcoming.length === 0 && <div className="empty">Khong co cong viec sap den han.</div>}
          {upcoming.map((t) => {
            const days = Math.ceil((t.dueDate!.getTime() - now.getTime()) / 86400000)
            return (
              <div className="row" key={t.id}>
                <span>{t.title}</span>
                <span>{days} ngay</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="spotlight">
        <div className="lab">Du an can chu y nhat</div>
        <div className="name">{spotlight ? spotlight.name : "Chua co du an"}</div>
        <div className="meta">{spotlight ? riskyProjects.length + " du an dang co task qua han" : "Khong co du an rui ro"}</div>
      </div>

      <div className="card">
        <div className="ch"><h3>Phan bo gia tri du an</h3></div>
        <div className="pvd-total">Tong gia tri: {fmtVnd(pvdTotal)}</div>
        <div className="pvd-legend">
          {withValue.length === 0 && <div className="empty">Chua co du an khai bao gia tri.</div>}
          {withValue.slice(0, 6).map((p) => (
            <div className="row" key={p.id}>
              <span>{p.name}</span>
              <span>{fmtVnd(p.value ?? 0)}</span>
            </div>
          ))}
        </div>
        <div className="pvd-progress-pct">{leaderPct}% thuoc du an dan dau</div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="ch"><h3>Phan bo trang thai</h3></div>
          <div className="status-mini-bars">
            <div className="mb-doing">Dang lam: {pct(doing)}% ({doing})</div>
            <div className="mb-done">Hoan thanh: {pct(done)}% ({done})</div>
            <div className="mb-over">Qua han: {pct(overdueCount)}% ({overdueCount})</div>
          </div>
        </div>

        <div className="card">
          <div className="ch"><h3>Khoi luong cong viec</h3></div>
          <div className="team-body">
            {workload.length === 0 && <div className="empty">Chua co cong viec duoc phan cong.</div>}
            {workload.map(([name, count]) => (
              <div className="row" key={name}>
                <span>{name}</span>
                <span>{count} viec</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="ch"><h3>Muc uu tien</h3></div>
          <div className="exp-legend">
            <div className="row"><span>Cao</span><span id="p-high">{pHigh}</span></div>
            <div className="row"><span>Trung binh</span><span id="p-med">{pMed}</span></div>
            <div className="row"><span>Thap</span><span id="p-low">{pLow}</span></div>
          </div>
          <div className="exp-progress-pct">{totalTasks ? Math.round((pHigh / totalTasks) * 100) : 0}% task uu tien cao</div>
        </div>
      </div>

      <div className="ch"><h3>The trang thai</h3></div>
      <div className="paycard-row">
        <div className="paycard">
          <div className="lab">Mau dang kiem thu</div>
          <div id="k-samples" className="val">{samplesTesting}</div>
          <div className="sub">{samples.length} mau tong</div>
        </div>
        <div className="paycard">
          <div className="lab">Tien do ke hoach TB</div>
          <div id="k-plan-progress" className="val">{planProgressAvg}%</div>
        </div>
        <div className="paycard">
          <div className="lab">Khach hang hop tac</div>
          <div id="k-customers" className="val">{customers}</div>
        </div>
        <div className="paycard">
          <div className="lab">Gia tri bao gia</div>
          <div id="k-quote-value" className="val">{fmtVnd(quoteValue)}</div>
          <div className="sub">{quoteItemCount} hang muc</div>
        </div>
      </div>

      <div className="ch"><h3>Tinh hinh thiet bi</h3></div>
      <div className="paycard-row">
        <div className="paycard">
          <div className="lab">Tong thiet bi</div>
          <div id="eq-total" className="val">{eqTotal}</div>
        </div>
        <div className="paycard">
          <div className="lab">San sang</div>
          <div id="eq-ready" className="val">{eqReady}</div>
        </div>
        <div className="paycard">
          <div className="lab">Can kiem dinh som</div>
          <div id="eq-soon" className="val">{eqSoon}</div>
        </div>
        <div className="paycard">
          <div className="lab">Qua han kiem dinh</div>
          <div id="k-cal-overdue" className="val">{eqOverdue}</div>
        </div>
      </div>

      <div className="card">
        <div className="ch"><h3>Cong viec qua han lau nhat</h3></div>
        <table>
          <thead><tr><th>Cong viec</th><th>Du an</th><th>Phu trach</th><th>Han chot</th><th>So ngay tre</th></tr></thead>
          <tbody id="overdue-body">
            {top3Overdue.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td>{t.project ? t.project.name : "-"}</td>
                <td>{t.assigneeId ?? "-"}</td>
                <td>{t.dueDate ? t.dueDate.toLocaleDateString("vi-VN") : "-"}</td>
                <td>{Math.ceil((now.getTime() - t.dueDate!.getTime()) / 86400000)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {top3Overdue.length === 0 && <div id="overdue-empty" className="empty">Khong co task nao qua han.</div>}
      </div>
    </section>
  )
}
