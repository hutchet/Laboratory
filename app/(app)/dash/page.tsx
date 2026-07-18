// @ts-nocheck
import { db } from "@/lib/db"
import { DonutChart } from "@/components/DonutChart"
import { BubbleChart } from "@/components/BubbleChart"
import { LineChart } from "@/components/LineChart"

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


function dashInitials(name: string) {
  const p = name.trim().split(/\s+/)
  return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : name.slice(0, 2)).toUpperCase()
}
const AV_PAL = ["#5b7bff","#e2665f","#2ab090","#e9963e","#9b6ff7","#3ba0c4"]
function dashAvColor(n: string) { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) & 0xffff; return AV_PAL[h % AV_PAL.length] }
export default async function DashPage() {
  // Dung try/catch de tranh crash neu bang chua duoc migrate tren Neon Production
  const [tasks, projects, customersRaw, quotes, equipment, samples, testItems, members] = await Promise.all([
    db.task.findMany({ include: { project: true } }).catch(() => [] as any[]),
    db.project.findMany({ include: { tasks: true } }).catch(() => [] as any[]),
    db.customer.count().catch(() => 0),
    db.quote.findMany({ include: { catalogItems: true } }).catch(() => [] as any[]),
    db.equipment.findMany().catch(() => [] as any[]),
    db.sample.findMany().catch(() => [] as any[]),
    db.testItem.findMany().catch(() => [] as any[]),
    db.member.findMany().catch(() => [] as any[]),
  ]) as any
  const customers = customersRaw
  const memberName = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Chưa gán"

  const now = new Date()
  const totalTasks = tasks.length
  const tasksWithProject = tasks.filter((t) => t.projectId).length
  const kUtil = totalTasks ? Math.round((tasksWithProject / totalTasks) * 100) : 0
  const internalTaskCount = tasks.filter((t) => !t.projectId).length
  // Week trend: tasks created in current week vs last week
  const oneWeekAgo = new Date(now); oneWeekAgo.setDate(now.getDate() - 7)
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14)
  const activeThisWeek = tasks.filter((t) => t.status !== "done" && t.createdAt >= oneWeekAgo).length
  const activeLastWeek = tasks.filter((t) => t.status !== "done" && t.createdAt >= twoWeeksAgo && t.createdAt < oneWeekAgo).length
  const activeDiff = activeThisWeek - activeLastWeek
  const activeTasks = tasks.filter((t) => t.status !== "done")
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== "done")
  const riskyProjects = projects.filter((p) => p.tasks.some((t) => t.dueDate && t.dueDate < now && t.status !== "done"))
  const spotlight = riskyProjects[0] ?? projects[0]
  const riskThisWeek = riskyProjects.length
  const riskLastWeek = Math.max(0, riskThisWeek - Math.floor(Math.random() * 0)) // placeholder

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
    const key = memberName(t.assigneeId)
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
            <div className="kcard kb kcard-hero pcard clickable" data-detail="kpi-util"
              data-modal-title="Dự án/Nội bộ"
              data-modal-wide="1"
              data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi"><div class="mdl-kpi-v">${tasksWithProject}</div><div class="mdl-kpi-l">Theo dự án</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${internalTaskCount}</div><div class="mdl-kpi-l">Nội bộ phát sinh</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${kUtil}%</div><div class="mdl-kpi-l">Tỷ lệ theo dự án</div></div></div><div class="mdl-sect">Công việc nội bộ phát sinh</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${tasks.filter(t=>!t.projectId).slice(0,8).map(t=>{const st=t.status==='done'?'st-done':t.status==='doing'?'st-doing':'st-todo';const stL=t.status==='done'?'Hoàn thành':t.status==='doing'?'Đang làm':'Chưa làm';const mem=memberName(t.assigneeId);return '<tr><td>'+t.title+'</td><td><span class="pill" style="color:var(--neutral);background:var(--neutral-soft)">Nội bộ phát sinh</span></td><td>'+mem+'</td><td>'+( t.dueDate?t.dueDate.toLocaleDateString('vi-VN'):'-')+'</td><td><span class="tag2 '+st+'">'+stL+'</span></td></tr>';}).join('')}</tbody></table></div>`}>
            
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
                <div className="kcard-trend" id="k-util-trend" style={activeDiff !== 0 ? { color: activeDiff > 0 ? 'var(--green)' : 'var(--red)', background: activeDiff > 0 ? 'var(--green-soft)' : 'var(--red-soft)', display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 } : { display: 'none' }}>
                  {activeDiff > 0 ? '+' : ''}{activeDiff !== 0 ? <><span className="wk-chg">{activeDiff > 0 ? '+' : '−'}{Math.abs(activeDiff)}</span> so với tuần trước</> : null}
                </div>
              </div>
              <div className="s" id="k-util-t">{internalTaskCount} nội bộ phát sinh · {tasksWithProject} theo dự án</div>
            </div>
            <div className="kcard kg kcard-hero pcard clickable" data-detail="kpi-active"
              data-modal-title="Công việc đang hoạt động"
              data-modal-wide="1"
              data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi"><div class="mdl-kpi-v">${activeTasks.length}</div><div class="mdl-kpi-l">Đang hoạt động</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${done}</div><div class="mdl-kpi-l">Hoàn thành</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${totalTasks}</div><div class="mdl-kpi-l">Tổng cộng</div></div></div><div class="mdl-sect">Công việc chưa hoàn thành</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${activeTasks.slice(0,10).map(t=>{const st=t.status==='doing'?'st-doing':'st-todo';const stL=t.status==='doing'?'Đang làm':'Chưa làm';const mem=memberName(t.assigneeId);const over=t.dueDate&&t.dueDate<now;return '<tr><td>'+t.title+'</td><td>'+( t.project?t.project.name:'-')+'</td><td>'+mem+'</td><td style="'+( over?'color:var(--red)':'')+'">'+(t.dueDate?t.dueDate.toLocaleDateString('vi-VN'):'-')+'</td><td><span class="tag2 '+st+'">'+stL+'</span></td></tr>';}).join('')}</tbody></table></div>`}>
            
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
            <div className="kcard kr kcard-hero pcard clickable" data-detail="kpi-risk"
              data-modal-title="Dự án có rủi ro"
              data-modal-wide="1"
              data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi"><div class="mdl-kpi-v">${riskyProjects.length}</div><div class="mdl-kpi-l">Dự án rủi ro</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${overdueTasks.length}</div><div class="mdl-kpi-l">Task quá hạn</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${projects.length}</div><div class="mdl-kpi-l">Tổng dự án</div></div></div><div class="mdl-sect">Dự án có task quá hạn</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Dự án</th><th>Task quá hạn</th><th>Tổng task</th></tr></thead><tbody>${riskyProjects.slice(0,8).map(p=>{const cnt=p.tasks.filter(t=>t.dueDate&&t.dueDate<now&&t.status!=='done').length;return '<tr><td><b>'+p.name+'</b></td><td style="color:var(--red);font-weight:700">'+cnt+'</td><td>'+p.tasks.length+'</td></tr>';}).join('')}</tbody></table></div>`}>
            
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
          <div className="card clickable" data-detail="due-bars"
            data-modal-title="Công việc/hạn chốt sắp tới"
            data-modal-wide="1"
            data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi"><div class="mdl-kpi-v">${tasks.filter(t=>t.status!=='done'&&t.dueDate).length}</div><div class="mdl-kpi-l">Tổng chưa xong có hạn</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${overdueTasks.length}</div><div class="mdl-kpi-l">Quá hạn</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${tasks.filter(t=>t.status!=='done'&&t.dueDate&&t.dueDate>=now&&(t.dueDate.getTime()-now.getTime())<=7*86400000).length}</div><div class="mdl-kpi-l">Sắp tới (7 ngày)</div></div></div><div class="mdl-sect">Công việc theo thứ tự hạn chốt</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${tasks.filter(t=>t.status!=='done'&&t.dueDate).sort((a,b)=>a.dueDate!.getTime()-b.dueDate!.getTime()).slice(0,15).map(t=>{const s=t.dueDate&&t.dueDate<now?'over':'doing';const sl=s==='over'?'Quá hạn':'Đang làm';const sc=s==='over'?'st-over':'st-doing';const mem=memberName(t.assigneeId);return '<tr><td><b>'+t.title+'</b></td><td>'+(t.project?t.project.name:'<span class="pill" style="color:var(--neutral);background:var(--neutral-soft)">Nội bộ</span>')+'</td><td>'+mem+'</td><td style="'+(s==='over'?'color:var(--red)':'')+'">'+t.dueDate!.toLocaleDateString('vi-VN')+'</td><td><span class="tag2 '+sc+'">'+sl+'</span></td></tr>';}).join('')}</tbody></table></div>`}
            style={{ marginBottom: 0, flex: 1 }}>
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
            <div id="due-bars" style={{ padding: "4px 0 0" }}>
              <LineChart data={dueBuckets} color="var(--pri)" />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="spotlight clickable" id="dash-spotlight" data-detail="dash-projects"
            data-modal-title="Tổng quan dự án"
            data-modal-wide="1"
            data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi"><div class="mdl-kpi-v">${projects.length}</div><div class="mdl-kpi-l">Tổng dự án</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${riskyProjects.length}</div><div class="mdl-kpi-l">Có rủi ro</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${projects.filter(p=>p.tasks.length>0&&p.tasks.every(t=>t.status==='done')).length}</div><div class="mdl-kpi-l">Đã hoàn thành</div></div></div><div class="mdl-sect">Tất cả dự án</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Dự án</th><th>Trạng thái</th><th>Tiến độ</th><th>Quá hạn</th><th>Hạn chốt</th></tr></thead><tbody>${projects.map(p=>{const tot=p.tasks.length;const dn=p.tasks.filter(t=>t.status==='done').length;const od=p.tasks.filter(t=>t.dueDate&&t.dueDate<now&&t.status!=='done').length;const pct=tot?Math.round(dn/tot*100):0;const st=dn===tot&&tot>0?'Đã xong':od>0?'Rủi ro':'Đang làm';const stc=dn===tot&&tot>0?'st-done':od>0?'st-over':'st-doing';const due='—';return '<tr><td><b>'+p.name+'</b></td><td><span class="tag2 '+stc+'">'+st+'</span></td><td>'+dn+'/'+tot+' ('+pct+'%)</td><td style="'+(od>0?'color:var(--red);font-weight:700':'')+'">'+od+'</td><td>'+due+'</td></tr>';}).join('')}</tbody></table></div>`}
            style={{ marginBottom: 0 }}>
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
          <div className="card clickable" data-detail="proj-value"
            data-modal-title="Phân bổ giá trị dự án"
            data-modal-wide="1"
            data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi"><div class="mdl-kpi-v">${withValue.length}</div><div class="mdl-kpi-l">Dự án có giá trị</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${new Intl.NumberFormat('vi-VN').format(Math.round(pvdTotal))}đ</div><div class="mdl-kpi-l">Tổng giá trị</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${withValue[0]?.name||'—'}</div><div class="mdl-kpi-l">Dự án lớn nhất</div></div></div><div class="mdl-sect">Chi tiết giá trị từng dự án</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Dự án</th><th>Giá trị (VNĐ)</th><th>Tỷ trọng</th></tr></thead><tbody>${withValue.map(p=>{const pct=pvdTotal?Math.round((p.value??0)/pvdTotal*100):0;return '<tr><td><b>'+p.name+'</b></td><td>'+new Intl.NumberFormat('vi-VN').format(Math.round(p.value??0))+'đ</td><td><b>'+pct+'%</b></td></tr>';}).join('')}</tbody></table></div>`}
            style={{ marginBottom: 0, flex: 1 }}>
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
              <div className="pvd-donut-wrap" id="pvd-donut">
                <DonutChart
                  size={110}
                  strokeWidth={3}
                  background="var(--line)"
                  segments={pvdTop.map((p, i) => ({ value: p.value ?? 0, color: PVD_COLORS[i % PVD_COLORS.length] }))}
                  center={(
                    <div className="pvd-donut-center">
                      <div className="pvd-donut-lab">Tổng</div>
                      <div className="pvd-donut-val" id="pvd-total-val">{fmtVnd(pvdTotal)}</div>
                    </div>
                  )}
                />
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
        <div className="card clickable" data-detail="status"
          data-modal-title="Phân bổ trạng thái công việc"
          data-modal-wide="1"
          data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi"><div class="mdl-kpi-v">${doing}</div><div class="mdl-kpi-l">Đang làm</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${done}</div><div class="mdl-kpi-l">Hoàn thành</div></div><div class="mdl-kpi" style="background:var(--red-soft)"><div class="mdl-kpi-v" style="color:var(--red)">${overdueCount}</div><div class="mdl-kpi-l">Quá hạn</div></div></div><div class="mdl-sect"><span class="dot" style="background:var(--neutral2);margin-right:6px;vertical-align:middle"></span>Đang làm</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${tasks.filter(t=>t.status==='doing').map(t=>{const mem=memberName(t.assigneeId);const over=t.dueDate&&t.dueDate<now;return '<tr><td><b>'+t.title+'</b></td><td>'+(t.project?t.project.name:'Nội bộ')+'</td><td>'+mem+'</td><td style="'+(over?'color:var(--red)':'')+'">'+( t.dueDate?t.dueDate.toLocaleDateString('vi-VN'):'-')+'</td><td><span class="tag2 st-doing">Đang làm</span></td></tr>';}).join('')}</tbody></table></div><div class="mdl-sect"><span class="dot" style="background:var(--green);margin-right:6px;vertical-align:middle"></span>Hoàn thành</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${tasks.filter(t=>t.status==='done').map(t=>{const mem=memberName(t.assigneeId);return '<tr><td><b>'+t.title+'</b></td><td>'+(t.project?t.project.name:'Nội bộ')+'</td><td>'+mem+'</td><td>'+(t.dueDate?t.dueDate.toLocaleDateString('vi-VN'):'-')+'</td><td><span class="tag2 st-done">Hoàn thành</span></td></tr>';}).join('')}</tbody></table></div><div class="mdl-sect"><span class="dot" style="background:var(--red);margin-right:6px;vertical-align:middle"></span>Quá hạn</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${tasks.filter(t=>t.dueDate&&t.dueDate<now&&t.status!=='done').map(t=>{const mem=memberName(t.assigneeId);return '<tr><td><b>'+t.title+'</b></td><td>'+(t.project?t.project.name:'Nội bộ')+'</td><td>'+mem+'</td><td style="color:var(--red)">'+t.dueDate!.toLocaleDateString('vi-VN')+'</td><td><span class="tag2 st-over">Quá hạn</span></td></tr>';}).join('')}</tbody></table></div>`}
          style={{ marginBottom: 0, display: "flex", flexDirection: "column" }}>
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
            <span id="status-trend-badge" style={{ background: doneTrendPct >= 50 ? "var(--green-soft)" : "var(--red-soft)", color: doneTrendPct >= 50 ? "var(--green)" : "var(--red)", fontWeight: 600, padding: "3px 9px", borderRadius: 20, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {doneTrendPct >= 50
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l8 10H4l8-10z"/></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20l-8-10h16l-8 10z"/></svg>
              }
              {doneTrendPct}% hoàn thành
            </span>
          </div>
          <div className="status-stackbar" id="status-mini-bars" style={{ display: "flex", flexDirection: "column", gap: 6, margin: "10px 0 4px" }}>
            {/* Horizontal segment bars per status */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11.5, color: "var(--ink)", width: 70, flexShrink: 0 }}>Đang làm</div>
              <div style={{ flex: 1, height: 9, borderRadius: 999, background: "var(--bg)", overflow: "hidden" }}>
                <div style={{ width: `${pct(doing)}%`, height: "100%", background: "var(--neutral2)", borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)", width: 34, textAlign: "right" }}>{pct(doing)}%</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11.5, color: "var(--ink)", width: 70, flexShrink: 0 }}>Hoàn thành</div>
              <div style={{ flex: 1, height: 9, borderRadius: 999, background: "var(--bg)", overflow: "hidden" }}>
                <div style={{ width: `${pct(done)}%`, height: "100%", background: "var(--muted)", borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)", width: 34, textAlign: "right" }}>{pct(done)}%</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 11.5, color: "var(--ink)", width: 70, flexShrink: 0 }}>Quá hạn</div>
              <div style={{ flex: 1, height: 9, borderRadius: 999, background: "var(--bg)", overflow: "hidden" }}>
                <div style={{ width: `${pct(overdueCount)}%`, height: "100%", background: "var(--pri)", borderRadius: 999 }} />
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--red)", width: 34, textAlign: "right" }}>{pct(overdueCount)}%</div>
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

        <div className="card clickable" data-detail="workload"
          data-modal-title="Khối lượng công việc"
          data-modal-wide="1"
          data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi"><div class="mdl-kpi-v">${members.length}</div><div class="mdl-kpi-l">Thành viên</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${activeTasks.length}</div><div class="mdl-kpi-l">Đang làm</div></div><div class="mdl-kpi"><div class="mdl-kpi-v">${overdueTasks.length}</div><div class="mdl-kpi-l">Quá hạn</div></div></div><div class="mdl-sect">Phân công công việc theo thành viên</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Thành viên</th><th>Đang làm</th><th>Quá hạn</th><th>Hoàn thành</th></tr></thead><tbody>${members.map(m=>{const mine=tasks.filter(t=>t.assigneeId===m.id);const a=mine.filter(t=>t.status!=='done').length;const o=mine.filter(t=>t.dueDate&&t.dueDate<now&&t.status!=='done').length;const d=mine.filter(t=>t.status==='done').length;return '<tr><td><div class="person"><span class="av" style="width:26px;height:26px;font-size:10px;background:'+dashAvColor(m.name)+';border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:600;margin-right:7px;">'+dashInitials(m.name)+'</span>'+m.name+'</div></td><td><b>'+a+'</b></td><td><b style="color:var(--red)">'+o+'</b></td><td>'+d+'</td></tr>';}).join('')}</tbody></table></div>`}
          style={{ marginBottom: 0 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0" }}>
            <div className="bubble-chart" id="team-bubbles" style={{ flex: "0 0 auto", width: 160 }}>
              <BubbleChart
                data={workload.map(([name, count], i) => ({ label: name, value: count, color: PVD_COLORS[i % PVD_COLORS.length] }))}
                emptyLabel="Chưa có phân công."
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {workload.map(([name, count], i) => (
                <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--line)", fontSize: 12.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: PVD_COLORS[i % PVD_COLORS.length], display: "inline-block", flexShrink: 0 }} />
                    <span style={{ color: "var(--ink)", fontWeight: 500 }}>{name}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>{count}</span>
                </div>
              ))}
              {workload.length > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  <span>Tổng đang làm</span>
                  <span style={{ fontWeight: 700, color: "var(--ink)" }}>{activeTasks.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card clickable" data-detail="priority"
          data-modal-title="Mức độ ưu tiên công việc"
          data-modal-wide="1"
          data-modal-body={`<div class="mdl-kpi-row"><div class="mdl-kpi" style="background:var(--red-soft)"><div class="mdl-kpi-v" style="color:var(--red)">${pHigh}</div><div class="mdl-kpi-l">Ưu tiên cao</div></div><div class="mdl-kpi" style="background:var(--amber-soft)"><div class="mdl-kpi-v" style="color:var(--amber)">${pMed}</div><div class="mdl-kpi-l">Trung bình</div></div><div class="mdl-kpi" style="background:var(--green-soft)"><div class="mdl-kpi-v" style="color:var(--green)">${pLow}</div><div class="mdl-kpi-l">Thấp</div></div></div><div class="mdl-sect"><span class="dot" style="background:var(--red);margin-right:6px;vertical-align:middle"></span>Ưu tiên cao</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${tasks.filter(t=>t.priority==='high').map(t=>{const s=t.status==='done'?'st-done':t.dueDate&&t.dueDate<now?'st-over':'st-doing';const sl={'st-done':'Hoàn thành','st-over':'Quá hạn','st-doing':'Đang làm'}[s]||'Chưa làm';const mem=memberName(t.assigneeId);return '<tr><td><b>'+t.title+'</b></td><td>'+(t.project?t.project.name:'Nội bộ')+'</td><td>'+mem+'</td><td style="'+(s==='st-over'?'color:var(--red)':'')+'">'+( t.dueDate?t.dueDate.toLocaleDateString('vi-VN'):'-')+'</td><td><span class="tag2 '+s+'">'+sl+'</span></td></tr>';}).join('')}</tbody></table></div><div class="mdl-sect"><span class="dot" style="background:var(--amber);margin-right:6px;vertical-align:middle"></span>Trung bình</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${tasks.filter(t=>t.priority==='med').map(t=>{const s=t.status==='done'?'st-done':t.dueDate&&t.dueDate<now?'st-over':'st-doing';const sl={'st-done':'Hoàn thành','st-over':'Quá hạn','st-doing':'Đang làm'}[s]||'Chưa làm';const mem=memberName(t.assigneeId);return '<tr><td><b>'+t.title+'</b></td><td>'+(t.project?t.project.name:'Nội bộ')+'</td><td>'+mem+'</td><td style="'+(s==='st-over'?'color:var(--red)':'')+'">'+( t.dueDate?t.dueDate.toLocaleDateString('vi-VN'):'-')+'</td><td><span class="tag2 '+s+'">'+sl+'</span></td></tr>';}).join('')}</tbody></table></div><div class="mdl-sect"><span class="dot" style="background:var(--green);margin-right:6px;vertical-align:middle"></span>Ưu tiên thấp</div><div class="rtable-wrap"><table class="rtable"><thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Trạng thái</th></tr></thead><tbody>${tasks.filter(t=>t.priority==='low').map(t=>{const s=t.status==='done'?'st-done':t.dueDate&&t.dueDate<now?'st-over':'st-doing';const sl={'st-done':'Hoàn thành','st-over':'Quá hạn','st-doing':'Đang làm'}[s]||'Chưa làm';const mem=memberName(t.assigneeId);return '<tr><td><b>'+t.title+'</b></td><td>'+(t.project?t.project.name:'Nội bộ')+'</td><td>'+mem+'</td><td style="'+(s==='st-over'?'color:var(--red)':'')+'">'+( t.dueDate?t.dueDate.toLocaleDateString('vi-VN'):'-')+'</td><td><span class="tag2 '+s+'">'+sl+'</span></td></tr>';}).join('')}</tbody></table></div>`}
          style={{ marginBottom: 0 }}>
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
            <div id="donut">
              <DonutChart
                size={110}
                strokeWidth={3}
                background="var(--line)"
                segments={[
                  { value: pHigh, color: "var(--pri)" },
                  { value: pMed, color: "var(--muted)" },
                  { value: pLow, color: "var(--line)" },
                ]}
              />
            </div>
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
                <td><span style={{ display: "flex", alignItems: "center", gap: 7 }}>{(() => { const n = memberName(t.assigneeId); return n !== "Chưa gán" ? <span style={{ width: 24, height: 24, fontSize: 9, borderRadius: 5, background: dashAvColor(n), color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 600, flexShrink: 0 }}>{dashInitials(n)}</span> : null })()}{memberName(t.assigneeId)}</span></td>
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
