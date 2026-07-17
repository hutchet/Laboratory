"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createQuote, deleteQuote } from "./actions"

type Row = { id: string; title: string; code: string | null; status: string | null; customerName: string | null; itemCount: number; totalAmount: number | null }

function fmtVnd(n: number) { return n.toLocaleString("vi-VN") + " đ" }

export default function QuoteOverviewClient({ quotes, customers, canCreate, canDelete }: {
  quotes: Row[]
  customers: { id: string; name: string }[]
  canCreate: boolean
  canDelete: boolean
}) {
  const [q, setQ] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const filtered = useMemo(() => quotes.filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()) || (r.code ?? "").toLowerCase().includes(q.toLowerCase())), [quotes, q])

  const kpi = useMemo(() => {
    const total = quotes.length
    const approved = quotes.filter((r) => r.status === "Đã duyệt").length
    const value = quotes.reduce((s, r) => s + (r.totalAmount ?? 0), 0)
    return { total, approved, value }
  }, [quotes])

  function onNew() {
    if (!canCreate) return
    const fd = new FormData()
    fd.set("title", "Báo giá mới")
    startTransition(async () => {
      const id = await createQuote(fd)
      router.push(`/quote/${id}`)
    })
  }

  function onDelete(id: string) {
    if (!confirm("Xoá báo giá này?")) return
    startTransition(async () => { await deleteQuote(id) })
  }

  return (
    <section id="page-quote-overview">
      <div id="ql-view">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Bảng báo giá</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <input id="ql-search" className="search-input" placeholder="Tìm kiếm báo giá..." style={{ width: 220, minWidth: 0 }} value={q} onChange={(e) => setQ(e.target.value)} />
            {canCreate && <button className="btn-pri" id="btn-newquote" onClick={onNew} disabled={pending}>+ Tạo báo giá</button>}
          </div>
        </div>
        <div id="ql-overview-analytics" className="grid kpis" style={{ marginBottom: 20 }}>
          <div className="kcard kb"><div className="v">{kpi.total}</div><div className="l">Tổng báo giá</div></div>
          <div className="kcard kg"><div className="v">{kpi.approved}</div><div className="l">Đã duyệt</div></div>
          <div className="kcard kp"><div className="v">{fmtVnd(kpi.value)}</div><div className="l">Tổng giá trị</div></div>
        </div>
        <div id="ql-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
          {filtered.map((r) => (
            <div className="cucard" key={r.id}>
              <div className="cucard-head">
                <div className="cucard-title"><h4>{r.title}</h4><div className="cu-sub">{r.code ?? "—"} · {r.customerName ?? "Chưa gán KH"}</div></div>
                <div className="cucard-acts">
                  <a className="btn-line" href={`/quote/${r.id}`}>Sửa</a>
                  {canDelete && <button className="btn-line" onClick={() => onDelete(r.id)}>Xoá</button>}
                </div>
              </div>
              <div className="cucard-info">
                <div>Trạng thái: {r.status ?? "Nháp"}</div>
                <div>{r.itemCount} hạng mục</div>
              </div>
              <div className="cucard-footer"><span /><span>{fmtVnd(r.totalAmount ?? 0)}</span></div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div id="ql-empty" className="empty" style={{ marginTop: 40 }}>Chưa có báo giá. Nhấn <b>Tạo báo giá</b> để bắt đầu.</div>
        )}
      </div>
    </section>
  )
}
