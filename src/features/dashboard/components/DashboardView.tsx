"use client"

// Port day du Dashboard ("Tong quan") tu ban goc (taskflow_original.html, the
// <section id="page-dash"> dong 3138-3299 + renderDash() va cac ham lien quan
// dong 4649-5170). CSS goc (kcard/paycard/spotlight/bal-*/pvd-*/nest-*/hb-*)
// da duoc port san trong globals.css, scoped duoi #page-dash - nen bao boc
// toan bo noi dung trong <section id="page-dash"> giong ban goc.
//
// Khong port lai toolbar loc (df-project/df-owner/df-range): ban goc khong co
// markup HTML tuong ung nen dashFilter luon o trang thai mac dinh "tat ca".
// Da port modal chi tiet (openDetail) cho toan bo card tren trang Tong quan:
// status/priority/kpi-active/kpi-risk/kpi-util/overdue/due-bars/workload/
// activity/dash-projects/spot-project. Rieng "spot-all" (xem tat ca canh bao
// du an) khong co diem bam tuong ung trong markup hien tai nen chua duoc noi -
// xem computeDashboardDetail trong compute.ts.
import { useMemo, useState } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { AvatarInitials } from "@/shared/ui/avatar-initials"
import type { DashboardRawData } from "../types"
import {
  bannerDate,
  computeDashboardDetail,
  computeDueBars,
  computeHeat,
  computeKpi,
  computeOverdue,
  computePaycards1,
  computePaycards2,
  computePriority,
  computeProjectList,
  computePvd,
  computeSpotlight,
  computeStatusBar,
  computeTeam,
  currentMonthValue,
  fmtDateVN,
  pvdMonthOptions,
  type DashboardDetailType,
  type KpiTrend,
} from "../compute"
import { DueBarsChart } from "./DueBarsChart"
import { DonutSvg } from "@/shared/ui/donut-svg"
import { DashboardDetailModal } from "./DashboardDetailModal"

type DueBarsMode = "day" | "week" | "month"

const DUE_BARS_MODES: [DueBarsMode, string][] = [
  ["day", "Ngày"],
  ["week", "Tuần"],
  ["month", "Tháng"],
]

const ICON_STROKE = { fill: "none" as const, stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }

export function DashboardView({ data }: { data: DashboardRawData }) {
  const [dueBarsMode, setDueBarsMode] = useState<DueBarsMode>("day")
  const [pvdMonth, setPvdMonth] = useState(currentMonthValue())
  const [showTeamList, setShowTeamList] = useState(false)
  // Port lai openDetail(type) ban goc: bam vao cac the/card de mo modal danh sach
  // cong viec/du an/thanh vien lien quan - xem computeDashboardDetail trong compute.ts.
  const [detailType, setDetailType] = useState<DashboardDetailType | null>(null)

  const { tasks, projects, members, samples, equipment, quotes, customers, testItems, bookings } = data

  const kpi = useMemo(() => computeKpi(tasks), [tasks])
  const statusBar = useMemo(() => computeStatusBar(tasks), [tasks])
  const priority = useMemo(() => computePriority(tasks), [tasks])
  const dueBars = useMemo(() => computeDueBars(tasks), [tasks])
  const spotlight = useMemo(() => computeSpotlight(tasks, members), [tasks, members])
  const projectList = useMemo(() => computeProjectList(tasks, projects), [tasks, projects])
  const team = useMemo(() => computeTeam(tasks, members, testItems), [tasks, members, testItems])
  const pvd = useMemo(() => computePvd(projects, pvdMonth), [projects, pvdMonth])
  const paycards1 = useMemo(() => computePaycards1(samples, testItems, customers, quotes), [samples, testItems, customers, quotes])
  const paycards2 = useMemo(() => computePaycards2(equipment), [equipment])
  const overdue = useMemo(() => computeOverdue(tasks, members), [tasks, members])
  const heat = useMemo(() => computeHeat(equipment, bookings), [equipment, bookings])
  const monthOptions = useMemo(() => pvdMonthOptions(), [])
  const detail = useMemo(
    () => (detailType ? computeDashboardDetail(detailType, { tasks, members, projects, equipment, bookings }) : null),
    [detailType, tasks, members, projects, equipment, bookings],
  )

  const duePoints = dueBars[dueBarsMode]
  const dueTitleSuffix = dueBarsMode === "day" ? "(7 ngày tới)" : dueBarsMode === "week" ? "(6 tuần tới)" : "(6 tháng tới)"

  // Port .kcard-trend (so voi tuan truoc) - xem computeKpiTrend trong compute.ts.
  const renderTrend = (t: KpiTrend) => {
    if (!t) return null
    return (
      <div className={t.up ? "kcard-trend" : "kcard-trend dn"}>
        <span className="tri">{t.up ? "▲" : "▼"}</span>
        {t.pct}%
      </div>
    )
  }

  return (
    <PageShell title="Tổng quan" subtitle={bannerDate()}>
      <section id="page-dash">
        <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginBottom: 18, alignItems: "stretch" }} id="dash-top-grid">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="grid kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              <div className="kcard kb kcard-hero pcard clickable" onClick={() => setDetailType("kpi-util")}>
                <div className="kcard-top">
                  <div className="kcard-icon">
                    <svg viewBox="0 0 24 24" {...ICON_STROKE}><rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="18" rx="1" /></svg>
                  </div>
                  <div className="l">Dự án/nội bộ</div>
                </div>
                <div className="kcard-val-row"><div className="v">{kpi.util}%</div>{renderTrend(kpiTrend.util)}</div>
                <div className="s">theo dự án</div>
              </div>
              <div className="kcard kg kcard-hero pcard clickable" onClick={() => setDetailType("kpi-active")}>
                <div className="kcard-top">
                  <div className="kcard-icon">
                    <svg viewBox="0 0 24 24" {...ICON_STROKE}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" /></svg>
                  </div>
                  <div className="l">Công việc đang hoạt động</div>
                </div>
                <div className="kcard-val-row"><div className="v">{kpi.active}</div>{renderTrend(kpiTrend.active)}</div>
                <div className="s">{kpi.activeOverdueLabel}</div>
              </div>
              <div className="kcard kr kcard-hero pcard clickable" onClick={() => setDetailType("kpi-risk")}>
                <div className="kcard-top">
                  <div className="kcard-icon">
                    <svg viewBox="0 0 24 24" {...ICON_STROKE}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  </div>
                  <div className="l">Dự án có rủi ro</div>
                </div>
                <div className="kcard-val-row"><div className="v">{kpi.risk}</div>{renderTrend(kpiTrend.risk)}</div>
                <div className="s" />
              </div>
            </div>
            <div className="card" style={{ marginBottom: 0, flex: 1 }}>
              <div className="ch">
                <div className="ch-l">
                  <div className="ch-ic" style={{ background: "var(--pri-soft)", color: "var(--pri-d)" }}>
                    <svg viewBox="0 0 24 24" {...ICON_STROKE}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
                  </div>
                  <h3 className="clickable" onClick={() => setDetailType("due-bars")}>Công việc/hạn chốt {dueTitleSuffix}</h3>
                </div>
                <div className="pl-zoom">
                  {DUE_BARS_MODES.map(([v, label]) => (
                    <button key={v} type="button" className={dueBarsMode === v ? "active" : ""} onClick={() => setDueBarsMode(v)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <DueBarsChart points={duePoints} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="spotlight clickable" id="dash-spotlight" style={{ marginBottom: 0 }} onClick={() => spotlight && setDetailType("spot-project")}>
              <div>
                <div className="spotlight-lab">{spotlight ? spotlight.label : "Dự án cần chú ý nhất"}</div>
                <div className="spotlight-name">{spotlight ? spotlight.name : "Chưa có dự án nào"}</div>
                <div className="spotlight-meta">{spotlight ? spotlight.meta : "Thêm công việc để xem cảnh báo"}</div>
                {spotlight && spotlight.owners.length > 0 && (
                  <div className="spotlight-avatars" style={{ marginTop: 12, display: "flex", gap: 6 }}>
                    {spotlight.owners.map((o) => (
                      <AvatarInitials key={o.id} name={o.name} size={28} />
                    ))}
                    {spotlight.overflow > 0 && <span className="av-more">+{spotlight.overflow}</span>}
                  </div>
                )}
              </div>
              <div className="spotlight-actions">
                <span
                  className="spotlight-btn pri"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (spotlight) setDetailType("spot-project")
                  }}
                >
                  Xem dự án
                </span>
                <span
                  className="spotlight-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDetailType("spot-all")
                  }}
                >
                  Tất cả cảnh báo
                </span>
              </div>
            </div>
            <div className="card" style={{ marginBottom: 0, flex: 1 }}>
              <div className="ch">
                <div className="ch-l">
                  <div className="ch-ic" style={{ background: "var(--neutral-soft)", color: "var(--neutral)" }}>
                    <svg viewBox="0 0 24 24" {...ICON_STROKE}><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
                  </div>
                  <h3>Phân bố giá trị dự án</h3>
                </div>
                <select className="pvd-month-sel" value={pvdMonth} onChange={(e) => setPvdMonth(e.target.value)}>
                  {monthOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="exp-summary" id="pvd-summary">
                <div className="pvd-donut-wrap">
                  <DonutSvg segments={pvd.segments.map((s) => ({ value: s.value, color: s.color }))} />
                  <div className="pvd-donut-center">
                    <div className="pvd-donut-lab">Tổng</div>
                    <div className="pvd-donut-val">{pvd.total >= 1000000 ? `${(Math.round(pvd.total / 100000) / 10).toLocaleString("vi-VN")} Trđ` : `${pvd.total.toLocaleString("vi-VN")}đ`}</div>
                  </div>
                </div>
                <div className="exp-legend">
                  {pvd.segments.length === 0 ? (
                    <div className="empty" style={{ padding: "6px 0" }}>Chưa có dữ liệu.</div>
                  ) : (
                    pvd.segments.map((s) => (
                      <div key={s.name} className="pvd-leg-item">
                        <div className="pvd-leg-lab"><span className="dot" style={{ background: s.color }} />{s.name}</div>
                        <div className="pvd-leg-val">{s.value >= 1000000 ? `${(Math.round(s.value / 100000) / 10).toLocaleString("vi-VN")} Trđ` : `${s.value.toLocaleString("vi-VN")}đ`}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="exp-progress-wrap">
                <div className="exp-progress-lab"><span>{pvd.topPct}%</span> thuộc dự án dẫn đầu</div>
                <div className="exp-progress-track"><div className="exp-progress-fill" style={{ width: `${pvd.topPct}%` }} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 18, alignItems: "stretch" }}>
          <div className="card" style={{ marginBottom: 0, display: "flex", flexDirection: "column" }}>
            <div className="ch">
              <div className="ch-l">
                <div className="ch-ic" style={{ background: "var(--neutral-soft)", color: "var(--neutral)" }}>
                  <svg viewBox="0 0 24 24" {...ICON_STROKE}><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></svg>
                </div>
                <h3>Phân bố trạng thái</h3>
              </div>
              <span
                className="clickable"
                style={{ background: statusBar.up ? "var(--green-soft)" : "var(--red-soft)", color: statusBar.up ? "var(--green)" : "var(--red)", fontWeight: 600, padding: "3px 9px", borderRadius: 20, fontSize: 11 }}
                onClick={() => setDetailType("status")}
              >
                {statusBar.pd}%
              </span>
            </div>
            <div className="status-stackbar clickable" onClick={() => setDetailType("status")}>
              <div className="ssb-item" style={{ flex: `${Math.max(statusBar.pr, 3)} 1 0%` }}>
                <div className="ssb-val">{statusBar.pr}%</div>
                <div className="ssb-tick" style={{ background: "var(--neutral2)" }} />
                <div className="ssb-pill" style={{ background: "var(--neutral2)" }} />
              </div>
              <div className="ssb-item" style={{ flex: `${Math.max(statusBar.pd, 3)} 1 0%` }}>
                <div className="ssb-val">{statusBar.pd}%</div>
                <div className="ssb-tick" style={{ background: "var(--muted)" }} />
                <div className="ssb-pill" style={{ background: "var(--muted)" }} />
              </div>
              <div className="ssb-item" style={{ flex: `${Math.max(statusBar.po, 3)} 1 0%` }}>
                <div className="ssb-val">{statusBar.po}%</div>
                <div className="ssb-tick" style={{ background: "var(--pri)" }} />
                <div className="ssb-pill" style={{ background: "var(--pri)" }} />
              </div>
            </div>
            <div className="ssb-legend">
              <div className="ssb-leg-item"><span className="dot" style={{ background: "var(--neutral2)" }} />Đang làm</div>
              <div className="ssb-leg-item"><span className="dot" style={{ background: "var(--muted)" }} />Hoàn thành</div>
              <div className="ssb-leg-item"><span className="dot" style={{ background: "var(--pri)" }} />Quá hạn</div>
            </div>
            <div className="ssb-count-row" style={{ marginTop: "auto" }}>
              <div className="ssb-count-item"><div className="ssb-count-val">{statusBar.inprogN}</div><div className="ssb-count-lab">công việc đang làm</div></div>
              <div className="ssb-count-item"><div className="ssb-count-val">{statusBar.doneN}</div><div className="ssb-count-lab">công việc hoàn thành</div></div>
              <div className="ssb-count-item"><div className="ssb-count-val" style={{ color: "var(--red)" }}>{statusBar.overdueN}</div><div className="ssb-count-lab">công việc quá hạn</div></div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="ch">
              <div className="ch-l">
                <div className="ch-ic" style={{ background: "var(--neutral-soft)", color: "var(--neutral)" }}>
                  <svg viewBox="0 0 24 24" {...ICON_STROKE}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </div>
                <h3 className="clickable" onClick={() => setDetailType("workload")}>Khối lượng công việc</h3>
              </div>
              <span style={{ cursor: "pointer", fontSize: 11.5, color: "var(--pri)", fontWeight: 600 }} onClick={() => setShowTeamList((v) => !v)}>
                {showTeamList ? "Xem biểu đồ" : "Xem danh sách"}
              </span>
            </div>
            {!showTeamList ? (
              <div className="nest-donut-wrap">
                <div className="bubble-chart">
                  {team.bubbles.map((b, i) => {
                    const sizes = [86, 58, 40]
                    const shades = ["#1c2337", "#5a6580", "#a7afc2"]
                    const positions = [
                      { left: "0px", bottom: "0px", zIndex: 3 },
                      { left: "56px", top: "0px", zIndex: 2 },
                      { right: "0px", bottom: "22px", zIndex: 1 },
                    ]
                    const size = sizes[i] || 36
                    const pos = positions[i] || positions[2]
                    return (
                      <div key={b.id} className="bubble-circle" style={{ ...pos, position: "absolute", width: size, height: size, background: shades[i] || "#a7afc2" }}>
                        {b.active}
                      </div>
                    )
                  })}
                </div>
                <div className="nest-legend">
                  {team.bubbles.map((b, i) => {
                    const shades = ["#1c2337", "#5a6580", "#a7afc2"]
                    return (
                      <div key={b.id} className="nl-row">
                        <span className="nl-dot" style={{ background: shades[i] }} />
                        <span className="nl-name">{b.name}</span>
                        <span className="nl-val">{b.active}</span>
                      </div>
                    )
                  })}
                  <div className="nl-row" style={{ borderTop: "1px solid var(--line)", marginTop: 4, paddingTop: 6 }}>
                    <span className="nl-name" style={{ fontWeight: 600 }}>Tổng đang làm</span>
                    <span className="nl-val" style={{ fontWeight: 600, color: "var(--ink)" }}>{team.totalActive}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="tw-list">
                {team.rows.map((r) => (
                  <div key={r.id} className="tw-row">
                    <div className="person">
                      <AvatarInitials name={r.name} size={30} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{r.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{r.role || ""}</div>
                      </div>
                    </div>
                    <div className="tw-meta">{r.active} đang làm · {r.done} xong{r.overdue > 0 ? ` · ${r.overdue} quá hạn` : ""}</div>
                    <span className="rk-pill" style={{ color: r.color, background: `${r.color}1a` }}>{r.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="ch">
              <div className="ch-l">
                <div className="ch-ic" style={{ background: "var(--neutral-soft)", color: "var(--neutral)" }}>
                  <svg viewBox="0 0 24 24" {...ICON_STROKE}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
                </div>
                <h3>Mức ưu tiên</h3>
              </div>
            </div>
            <div className="exp-summary clickable" onClick={() => setDetailType("priority")}>
              <DonutSvg
                segments={[
                  { value: priority.high, color: "#d9435f" },
                  { value: priority.med, color: "#d99016" },
                  { value: priority.low, color: "#4f7fc7" },
                ]}
              />
              <div className="exp-legend">
                <div className="exp-row"><span className="dot" style={{ background: "var(--pri)" }} /><span className="exp-lab">Ưu tiên cao</span><span className="exp-val">{priority.high}</span></div>
                <div className="exp-row"><span className="dot" style={{ background: "var(--muted)" }} /><span className="exp-lab">Trung bình</span><span className="exp-val">{priority.med}</span></div>
                <div className="exp-row"><span className="dot" style={{ background: "var(--line)" }} /><span className="exp-lab">Thấp</span><span className="exp-val">{priority.low}</span></div>
              </div>
            </div>
            <div className="exp-progress-wrap">
              <div className="exp-progress-lab"><span>{priority.highShare}%</span> task ưu tiên cao</div>
              <div className="exp-progress-track"><div className="exp-progress-fill" style={{ width: `${priority.highShare}%` }} /></div>
            </div>
          </div>
        </div>

        <div className="ch" style={{ marginBottom: 10 }}><div className="ch-l"><h3 style={{ fontSize: 13.5 }}>Thẻ trạng thái</h3></div></div>
        <div className="paycard-row">
          <div className="paycard" style={{ background: "var(--kblue)" }}>
            <div className="pc-top"><div className="pc-ic"><svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}><path d="M9 2v6l-5.5 9.5A2 2 0 0 0 5.24 21h13.52a2 2 0 0 0 1.74-3.5L15 8V2" /><path d="M9 2h6" /></svg></div><div className="pc-lab">Mẫu đang kiểm thử</div></div>
            <div className="pc-val">{paycards1.samplesTesting}</div>
            <div className="pc-sub">{paycards1.samplesTotal} mẫu tổng</div>
          </div>
          <div className="paycard" style={{ background: "var(--kpurple)" }}>
            <div className="pc-top"><div className="pc-ic"><svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg></div><div className="pc-lab">Tiến độ kế hoạch TB</div></div>
            <div className="pc-val">{paycards1.planProgress}%</div>
            <div className="pc-sub">trung bình các hạng mục</div>
          </div>
          <div className="paycard" style={{ background: "var(--pri-soft)" }}>
            <div className="pc-top"><div className="pc-ic"><svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></div><div className="pc-lab">Khách hàng hợp tác</div></div>
            <div className="pc-val">{paycards1.customers}</div>
            <div className="pc-sub">đang hợp tác</div>
          </div>
          <div className="paycard" style={{ background: "var(--kgreen)" }}>
            <div className="pc-top"><div className="pc-ic"><svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div><div className="pc-lab">Giá trị báo giá</div></div>
            <div className="pc-val">{paycards1.quoteValueLabel}</div>
            <div className="pc-sub">{paycards1.quoteCount} hạng mục</div>
          </div>
        </div>

        <div className="ch" style={{ marginBottom: 10 }}><div className="ch-l"><h3 style={{ fontSize: 13.5 }}>Tình hình thiết bị</h3></div></div>
        <div className="paycard-row">
          <div className="paycard" style={{ background: "var(--neutral-soft)" }}>
            <div className="pc-top"><div className="pc-ic"><svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg></div><div className="pc-lab">Tổng thiết bị</div></div>
            <div className="pc-val">{paycards2.total}</div>
            <div className="pc-sub">danh mục thiết bị</div>
          </div>
          <div className="paycard" style={{ background: "var(--kgreen)" }}>
            <div className="pc-top"><div className="pc-ic"><svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}><polyline points="20 6 9 17 4 12" /></svg></div><div className="pc-lab">Thiết bị sẵn sàng</div></div>
            <div className="pc-val">{paycards2.ready}</div>
            <div className="pc-sub">còn hạn kiểm định</div>
          </div>
          <div className="paycard" style={{ background: "var(--amber-soft)" }}>
            <div className="pc-top"><div className="pc-ic"><svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div><div className="pc-lab">Cần kiểm định sớm</div></div>
            <div className="pc-val">{paycards2.soon}</div>
            <div className="pc-sub">trong 30 ngày tới</div>
          </div>
          <div className="paycard" style={{ background: "var(--kred)" }}>
            <div className="pc-top"><div className="pc-ic"><svg viewBox="0 0 24 24" width={16} height={16} {...ICON_STROKE}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></div><div className="pc-lab">Quá hạn kiểm định</div></div>
            <div className="pc-val">{paycards2.calOverdue}</div>
            <div className="pc-sub">cần lên lịch ngay</div>
          </div>
        </div>

        <div className="card">
          <div className="ch">
            <div className="ch-l">
              <div className="ch-ic" style={{ background: "var(--kred)", color: "var(--red)" }}>
                <svg viewBox="0 0 24 24" {...ICON_STROKE}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </div>
              <h3 className="clickable" onClick={() => setDetailType("overdue")}>3 công việc quá hạn lâu nhất</h3>
            </div>
            <span>cần xử lý gấp</span>
          </div>
          <table>
            <thead><tr><th>Công việc</th><th>Dự án</th><th>Phụ trách</th><th>Hạn chốt</th><th>Số ngày trễ</th></tr></thead>
            <tbody>
              {overdue.map((t) => (
                <tr key={t.id}>
                  <td><b>{t.title}</b></td>
                  <td>{t.project}</td>
                  <td><div className="person"><AvatarInitials name={t.ownerName} size={26} />{t.ownerName}</div></td>
                  <td>{fmtDateVN(t.deadline)}</td>
                  <td><span className="pill" style={{ color: "var(--red)", background: "var(--red-soft)" }}>{t.late} ngày</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {overdue.length === 0 && <div className="empty" style={{ padding: "10px 0" }}>Không có công việc quá hạn.</div>}
        </div>

        <div className="card">
          <div className="ch">
            <div className="ch-l"><h3 className="clickable" onClick={() => setDetailType("dash-projects")}>Tiến độ theo dự án</h3></div>
          </div>
          {projectList.length === 0 ? (
            <div className="empty" style={{ padding: "10px 0" }}>Chưa có dự án nào có công việc.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {projectList.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12.5, width: 180, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  <div style={{ flex: 1, background: "var(--surface-small)", borderRadius: 6, overflow: "hidden", height: 10 }}>
                    <div style={{ width: `${p.pct}%`, background: p.overdue > 0 ? "var(--amber)" : p.pct >= 100 ? "var(--green)" : "var(--pri)", height: "100%" }} />
                  </div>
                  <span style={{ fontSize: 11.5, color: "var(--muted)", width: 96, textAlign: "right", flexShrink: 0 }}>{p.done}/{p.total} · {p.pct}%</span>
                  {p.overdue > 0 && <span className="pill" style={{ color: "var(--red)", background: "var(--red-soft)" }}>{p.overdue} trễ</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="ch">
            <div className="ch-l"><h3 className="clickable" onClick={() => setDetailType("activity")}>Mật độ đặt lịch thiết bị (7 ngày)</h3></div>
            <span>{heat.readyPct}% sẵn sàng{heat.maintCount > 0 ? ` · ${heat.maintCount} đang bảo trì` : ""}</span>
          </div>
          {heat.rows.length === 0 ? (
            <div className="empty" style={{ padding: "10px 0" }}>Chưa có danh mục thiết bị.</div>
          ) : (
            heat.rows.map((r) => (
              <div key={r.label} className="hb-row" title={`${r.label}: ${r.count} lượt đặt / 7 ngày`}>
                <span className="hb-lab">{r.label}</span>
                <span className="hb-track"><span className="hb-fill" style={{ width: `${r.pct}%` }} /></span>
                <span className="hb-val">{r.count}</span>
              </div>
            ))
          )}
        </div>
      </section>
      <DashboardDetailModal detail={detail} onClose={() => setDetailType(null)} />
    </PageShell>
  )
}

export default DashboardView
