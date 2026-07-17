import { db } from "@/lib/db"

function fmtVnd(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ"
}

const DONUT_R = 15.91549430918954

function DonutCircles({ segments }: { segments: Array<{ value: number; color: string }> }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  if (!total) return null
  let cumulative = 0
  return (
    <>
      {segments.map((seg, i) => {
        const pct = (seg.value / total) * 100
        const dashoffset = 25 - cumulative
        cumulative += pct
        if (pct <= 0) return null
        return (
          <circle
            key={i}
            cx="21"
            cy="21"
            r={DONUT_R}
            fill="transparent"
            stroke={seg.color}
            strokeWidth="3"
            strokeDasharray={`${pct} ${100 - pct}`}
            strokeDashoffset={dashoffset}
          />
        )
      })}
    </>
  )
}

const WEEKDAY_VN = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
const PVD_COLORS = ["var(--pri)", "var(--pri-d)", "var(--neutral)", "var(--green)", "var(--amber)", "var(--red)"]

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

  // Cong viec/han chot 7 ngay toi (xap xi bieu do goc, khong co du lieu JS goc de phuc dung y het)
  const dueBuckets: Array<{ label: string; count: number }> = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    const count = tasks.filter((t) => {
      if (!t.dueDate || t.status === "done") return false
      const dd = new Date(t.dueDate)
      return dd.getFullYear() === d.getFullYear() && dd.getMonth() === d.getMonth() && dd.getDate() === d.getDate()
    }).length
    dueBuckets.push({ label: i === 0 ? "Hôm nay" : WEEKDAY_VN[d.getDay()], count })
  }
  const dueMax = Math.max(1, ...dueBuckets.map((b) => b.count))

  const doing = tasks.filter((t) => t.status === "doing").length
  const done = tasks.filter((t) => t.status === "done").length
  const overdueCount = overdueTasks.length
  const pct = (n: number) => (totalTasks ? Math.round((n / totalTasks) * 100) : 0)

  const workloadMap: Record<string, number> = {}
  for (const t of activeTasks) {
    const key = t.assigneeId || "Chưa gán"
    workloadMap[key] = (workloadMap[key] || 0) + 1
  }
  const workload = Object.entries(workloadMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const workloadMax = Math.max(1, ...workload.map(([, c]) => c))

  const pHigh = tasks.filter((t) => t.priority === "high").length
  const pMed = tasks.filter((t) => t.priority === "med").length
  const pLow = tasks.filter((t) => t.priority === "low").length

  const withValue = projects.filter((p) => (p.value ?? 0) > 0).sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  const pvdTotal = withValue.reduce((s, p) => s + (p.value ?? 0), 0)
  const leaderPct = pvdTotal ? Math.round(((withValue[0]?.value ?? 0) / pvdTotal) * 100) : 0
  const pvdTop = withValue.slice(0, 6)

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

  const top3Overdue = overdueTasks
    .slice()
    .sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime())
    .slice(0, 3)

  const doneTrendPct = pct(done)

  return (
    <section id="page-dash">
      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginBottom: 18, alignItems: "stretch" }} id="dash-top-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="grid kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="kcard kb kcard-hero pcard">
              <div className="kcard-top">
                <div className="kcard-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="18" rx="1" />
                    <rect x="14" y="3" width="7" height="18" rx="1" />
                  </svg>
                </div>
                <div className="l">Dự án/nội bộ</div>
              </div>
              <div className="kcard-val-row">
                <div className="v" id="k-util">{kUtil}%</div>
                <div className="kcard-trend" id="k-util-trend" />
              </div>
              <div className="s" id="k-util-t">theo dự án</div>
            </div>
            <div className="kcard kg kcard-hero pcard">
              <div className="kcard-top">
                <div className="kcard-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
                  </svg>
                </div>
                <div className="l">Công việc đang hoạt động</div>
              </div>
              <div className="kcard-val-row">
                <div className="v" id="k-active">{activeTasks.length}</div>
                <div className="kcard-trend" id="k-active-trend" />
              </div>
              <div className="s" id="k-active-t">chưa hoàn thành</div>
            </div>
            <div className="kcard kr kcard-hero pcard">
              <div className="kcard-top">
                <div className="kcard-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="l">Dự án có rủi ro</div>
              </div>
              <div className="kcard-val-row">
                <div className="v" id="k-risk">{riskyProjects.length}</div>
                <div className="kcard-trend" id="k-risk-trend" />
              </div>
              <div className="s" id="k-risk-t" />
            </div>
          </div>
          <div className="card" style={{ marginBottom: 0, flex: 1 }}>
            <div className="ch">
              <div className="ch-l">
                <div className="ch-ic" style={{ background: "var(--pri-soft)", color: "var(--pri-d)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </div>
                <h3 id="due-bars-title">Công việc/hạn chốt</h3>
              </div>
            </div>
            <div className="due-bars" id="due-bars" style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 140, padding: "10px 4px" }}>
              {dueBuckets.map((b, i) => (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--pri-d)" }}>{b.count || ""}</div>
                  <div style={{ width: "70%", height: Math.max(4, (b.count / dueMax) * 90), background: b.count ? "var(--pri)" : "var(--line)", borderRadius: 4 }} />
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="spotlight" id="dash-spotlight" style={{ marginBottom: 0 }}>
            <div>
              <div className="spotlight-lab" id="spot-lab">Dự án cần chú ý nhất</div>
              <div className="spotlight-name" id="spot-name">{spotlight ? spotlight.name : "Chưa có dự án"}</div>
              <div className="spotlight-meta" id="spot-meta">
                {spotlight ? `${riskyProjects.length} dự án đang có task quá hạn` : "Không có dự án rủi ro"}
              </div>
            </div>
            <div className="spotlight-actions">
              <span className="spotlight-btn pri">Xem dự án</span>
              <span className="spotlight-btn">Tất cả cảnh báo</span>
            </div>
          </div>
          <div className="card" style={{ marginBottom: 0, flex: 1 }}>
            <div className="ch">
              <div className="ch-l">
                <div className="ch-ic" style={{ background: "var(--neutral-soft)", color: "var(--neutral)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                  </svg>
                </div>
                <h3>Phân bố giá trị dự án</h3>
              </div>
            </div>
            <div className="exp-summary" id="pvd-summary">
              <div className="pvd-donut-wrap">
                <svg width="110" height="110" viewBox="0 0 42 42" id="pvd-donut">
                  <circle cx="21" cy="21" r={DONUT_R} fill="transparent" stroke="var(--line)" strokeWidth="3" />
                  <DonutCircles segments={pvdTop.map((p, i) => ({ value: p.value ?? 0, color: PVD_COLORS[i % PVD_COLORS.length] }))} />
                </svg>
                <div className="pvd-donut-center">
                  <div className="pvd-donut-lab">Tổng</div>
                  <div className="pvd-donut-val" id="pvd-total-val">{fmtVnd(pvdTotal)}</div>
                </div>
              </div>
              <div className="exp-legend" id="pvd-legend">
                {pvdTop.length === 0 && <div className="empty">Chưa có dự án khai báo giá trị.</div>}
                {pvdTop.map((p, i) => (
                  <div className="exp-row" key={p.id}>
                    <span className="dot" style={{ background: PVD_COLORS[i % PVD_COLORS.length] }} />
                    <span className="exp-lab">{p.name}</span>
                    <span className="exp-val">{fmtVnd(p.value ?? 0)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="exp-progress-wrap">
              <div className="exp-progress-lab"><span id="pvd-progress-pct">{leaderPct}%</span>{" thuộc dự án dẫn đầu"}</div>
              <div className="exp-progress-track"><div className="exp-progress-fill" id="pvd-progress-fill" style={{ width: `${leaderPct}%` }} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 18, alignItems: "stretch" }}>
        <div className="card" style={{ marginBottom: 0, display: "flex", flexDirection: "column" }}>
          <div className="ch">
            <div className="ch-l">
              <div className="ch-ic" style={{ background: "var(--neutral-soft)", color: "var(--neutral)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                  <path d="M22 12A10 10 0 0 0 12 2v10z" />
                </svg>
              </div>
              <h3>Phân bổ trạng thái</h3>
            </div>
            <span id="status-trend-badge" style={{ background: "var(--green-soft)", color: "var(--green)", fontWeight: 600, padding: "3px 9px", borderRadius: 20, fontSize: 11 }}>{doneTrendPct}%</span>
          </div>
          <div className="status-stackbar" id="status-mini-bars" style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 90 }}>
            <div className="ssb-item" id="mb-prog" style={{ flex: "1 1 0%" }}>
              <div className="ssb-val" id="mb-prog-v">{pct(doing)}%</div>
              <div className="ssb-tick" style={{ background: "var(--neutral2)", height: Math.max(6, pct(doing)), borderRadius: 4 }} />
            </div>
            <div className="ssb-item" id="mb-done" style={{ flex: "1 1 0%" }}>
              <div className="ssb-val" id="mb-done-v">{pct(done)}%</div>
              <div className="ssb-tick" style={{ background: "var(--muted)", height: Math.max(6, pct(done)), borderRadius: 4 }} />
            </div>
            <div className="ssb-item" id="mb-over" style={{ flex: "1 1 0%" }}>
              <div className="ssb-val" id="mb-over-v">{pct(overdueCount)}%</div>
              <div className="ssb-tick" style={{ background: "var(--pri)", height: Math.max(6, pct(overdueCount)), borderRadius: 4 }} />
            </div>
          </div>
          <div className="ssb-legend">
            <div className="ssb-leg-item"><span className="dot" style={{ background: "var(--neutral2)" }} />{"Đang làm"}</div>
            <div className="ssb-leg-item"><span className="dot" style={{ background: "var(--muted)" }} />{"Hoàn thành"}</div>
            <div className="ssb-leg-item"><span className="dot" style={{ background: "var(--pri)" }} />{"Quá hạn"}</div>
          </div>
          <div className="ssb-count-row" id="ssb-count-row" style={{ marginTop: "auto" }}>
            <div className="ssb-count-item"><div className="ssb-count-val" id="mb-prog-n">{doing}</div><div className="ssb-count-lab">công việc đang làm</div></div>
            <div className="ssb-count-item"><div className="ssb-count-val" id="mb-done-n">{done}</div><div className="ssb-count-lab">công việc hoàn thành</div></div>
            <div className="ssb-count-item"><div className="ssb-count-val" id="mb-over-n" style={{ color: "var(--red)" }}>{overdueCount}</div><div className="ssb-count-lab">công việc quá hạn</div></div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="ch">
            <div className="ch-l">
              <div className="ch-ic" style={{ background: "var(--neutral-soft)", color: "var(--neutral)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3>Khối lượng công việc</h3>
            </div>
          </div>
          <div className="bubble-chart" id="team-bubbles" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "center", padding: "14px 0" }}>
            {workload.length === 0 && <div className="empty">Chưa có công việc được phân công.</div>}
            {workload.map(([name, count], i) => {
              const size = 40 + (count / workloadMax) * 50
              return (
                <div key={name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div
                    style={{
                      width: size,
                      height: size,
                      borderRadius: "50%",
                      background: PVD_COLORS[i % PVD_COLORS.length],
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {count}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", maxWidth: 70, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="ch">
            <div className="ch-l">
              <div className="ch-ic" style={{ background: "var(--neutral-soft)", color: "var(--neutral)" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3>Mức ưu tiên</h3>
            </div>
          </div>
          <div className="exp-summary">
            <svg width="110" height="110" viewBox="0 0 42 42" id="donut">
              <circle cx="21" cy="21" r={DONUT_R} fill="transparent" stroke="var(--line)" strokeWidth="3" />
              <DonutCircles
                segments={[
                  { value: pHigh, color: "var(--pri)" },
                  { value: pMed, color: "var(--muted)" },
                  { value: pLow, color: "var(--line)" },
                ]}
              />
            </svg>
            <div className="exp-legend">
              <div className="exp-row"><span className="dot" style={{ background: "var(--pri)" }} /><span className="exp-lab">Ưu tiên cao</span><span className="exp-val" id="p-high">{pHigh}</span></div>
              <div className="exp-row"><span className="dot" style={{ background: "var(--muted)" }} /><span className="exp-lab">Trung bình</span><span className="exp-val" id="p-med">{pMed}</span></div>
              <div className="exp-row"><span className="dot" style={{ background: "var(--line)" }} /><span className="exp-lab">Thấp</span><span className="exp-val" id="p-low">{pLow}</span></div>
            </div>
          </div>
          <div className="exp-progress-wrap">
            <div className="exp-progress-lab"><span id="exp-progress-pct">{totalTasks ? Math.round((pHigh / totalTasks) * 100) : 0}%</span>{" task ưu tiên cao"}</div>
            <div className="exp-progress-track"><div className="exp-progress-fill" id="exp-progress-fill" style={{ width: `${totalTasks ? Math.round((pHigh / totalTasks) * 100) : 0}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="ch" style={{ marginBottom: 10 }}><div className="ch-l"><h3 style={{ fontSize: 13.5 }}>Thẻ trạng thái</h3></div></div>
      <div className="paycard-row">
        <div className="paycard" style={{ background: "var(--kblue)" }}>
          <div className="pc-top"><div className="pc-lab">Mẫu đang kiểm thử</div></div>
          <div className="pc-val" id="k-samples">{samplesTesting}</div>
          <div className="pc-sub" id="k-samples-t">{samples.length} mẫu tổng</div>
        </div>
        <div className="paycard" style={{ background: "var(--kpurple)" }}>
          <div className="pc-top"><div className="pc-lab">Tiến độ kế hoạch TB</div></div>
          <div className="pc-val" id="k-plan-progress">{planProgressAvg}%</div>
          <div className="pc-sub">trung bình các hạng mục</div>
        </div>
        <div className="paycard" style={{ background: "var(--pri-soft)" }}>
          <div className="pc-top"><div className="pc-lab">Khách hàng hợp tác</div></div>
          <div className="pc-val" id="k-customers">{customers}</div>
          <div className="pc-sub">đang hợp tác</div>
        </div>
        <div className="paycard" style={{ background: "var(--kgreen)" }}>
          <div className="pc-top"><div className="pc-lab">Giá trị báo giá</div></div>
          <div className="pc-val" id="k-quote-value">{fmtVnd(quoteValue)}</div>
          <div className="pc-sub" id="k-quote-t">{quoteItemCount} hạng mục</div>
        </div>
      </div>

      <div className="ch" style={{ marginBottom: 10 }}><div className="ch-l"><h3 style={{ fontSize: 13.5 }}>Tình hình thiết bị</h3></div></div>
      <div className="paycard-row">
        <div className="paycard" style={{ background: "var(--neutral-soft)" }}>
          <div className="pc-top"><div className="pc-lab">Tổng thiết bị</div></div>
          <div className="pc-val" id="eq-total">{eqTotal}</div>
          <div className="pc-sub">danh mục thiết bị</div>
        </div>
        <div className="paycard" style={{ background: "var(--kgreen)" }}>
          <div className="pc-top"><div className="pc-lab">Thiết bị sẵn sàng</div></div>
          <div className="pc-val" id="eq-ready">{eqReady}</div>
          <div className="pc-sub">còn hạn kiểm định</div>
        </div>
        <div className="paycard" style={{ background: "var(--amber-soft)" }}>
          <div className="pc-top"><div className="pc-lab">Cần kiểm định sớm</div></div>
          <div className="pc-val" id="eq-soon">{eqSoon}</div>
          <div className="pc-sub">trong 30 ngày tới</div>
        </div>
        <div className="paycard" style={{ background: "var(--kred)" }}>
          <div className="pc-top"><div className="pc-lab">Quá hạn kiểm định</div></div>
          <div className="pc-val" id="k-cal-overdue">{eqOverdue}</div>
          <div className="pc-sub">cần lên lịch ngay</div>
        </div>
      </div>

      <div className="card">
        <div className="ch">
          <div className="ch-l">
            <div className="ch-ic" style={{ background: "var(--kred)", color: "var(--red)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3>3 công việc quá hạn lâu nhất</h3>
          </div>
          <span>cần xử lý gấp</span>
        </div>
        <table>
          <thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Số ngày trễ</th></tr></thead>
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
        {top3Overdue.length === 0 && <div id="overdue-empty" className="empty">Không có task nào quá hạn.</div>}
      </div>
    </section>
  )
}
