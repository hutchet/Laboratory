import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { can } from "@/lib/rbac"
import { notFound } from "next/navigation"
import Link from "next/link"
import { updateQuoteMeta, addQuoteItemFromCatalog, updateQuoteItemQty, removeQuoteItem } from "../actions"

const STATUSES = ["Nháp", "Chờ duyệt", "Đã duyệt", "Từ chối"]
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  "Nháp": { bg: "#fef3c7", fg: "#92400e" },
  "Chờ duyệt": { bg: "#dbeafe", fg: "#1e40af" },
  "Đã duyệt": { bg: "#dcfce7", fg: "#166534" },
  "Từ chối": { bg: "#fee2e2", fg: "#991b1b" },
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id
  const canEdit = userId ? await can(userId, "quote", "edit") : false

  const [quote, customers, projects, catalog] = await Promise.all([
    db.quote.findUnique({ where: { id }, include: { catalogItems: true } }),
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.project.findMany({ orderBy: { name: "asc" } }),
    db.testCatalogItem.findMany({ orderBy: { name: "asc" } }),
  ])
  if (!quote) notFound()

  const items = quote.catalogItems
  const sub = items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0)
  const vatPct = quote.vatPercent ?? 10
  const vatAmt = sub * (vatPct / 100)
  const grand = sub + vatAmt
  const badge = STATUS_STYLE[quote.status ?? "Nháp"] ?? STATUS_STYLE["Nháp"]

  return (
    <section id="page-quote-overview">
      <div id="ql-form-wrap">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Link className="btn-line" id="ql-back-btn" href="/quote">← Danh sách</Link>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }} id="ql-form-title">{quote.title || "Báo giá"}</h3>
          <span id="ql-status-badge" style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: badge.bg, color: badge.fg }}>{quote.status ?? "Nháp"}</span>
        </div>
        <input type="hidden" id="ql-id" defaultValue={quote.id} />

        <div className="card" style={{ marginBottom: 14 }}>
          <div className="ch"><h3>Thông tin báo giá</h3></div>
          <form action={canEdit ? updateQuoteMeta : undefined}>
            <input type="hidden" name="id" defaultValue={quote.id} />
            <div className="row">
              <div className="field" style={{ flex: 1, minWidth: 160 }}>
                <label>Khách hàng *</label>
                <select id="ql-customer" name="customerId" defaultValue={quote.customerId ?? ""} disabled={!canEdit}>
                  <option value="">-- Khách hàng --</option>
                  {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div className="field" style={{ flex: 1, minWidth: 160 }}>
                <label>Dự án</label>
                <select id="ql-project" name="projectId" defaultValue={quote.projectId ?? ""} disabled={!canEdit}>
                  <option value="">-- Dự án --</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="field" style={{ minWidth: 130 }}><label>Số báo giá</label><input id="ql-code" name="code" placeholder="BG-2026-001" defaultValue={quote.code ?? ""} disabled={!canEdit} /></div>
              <div className="field" style={{ minWidth: 120 }}><label>Ngày lập</label><input type="date" id="ql-date" name="quoteDate" defaultValue={quote.quoteDate ? new Date(quote.quoteDate).toISOString().slice(0, 10) : ""} disabled={!canEdit} /></div>
              <div className="field" style={{ width: 80 }}><label>VAT (%)</label><input type="number" id="ql-vat" name="vatPercent" defaultValue={vatPct} min={0} max={50} disabled={!canEdit} /></div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <div className="field" style={{ minWidth: 180 }}><label>Người lập</label><input id="ql-creator" name="creator" placeholder="Tên người lập" defaultValue={quote.creator ?? ""} disabled={!canEdit} /></div>
              <div className="field" style={{ flex: 2 }}><label>Điều khoản / Ghi chú</label><input id="ql-notes" name="notes" placeholder="Điều khoản thanh toán, thời gian hiệu lực..." defaultValue={quote.notes ?? ""} disabled={!canEdit} /></div>
              <div className="field" style={{ minWidth: 130 }}><label>Trạng thái</label>
                <select name="status" defaultValue={quote.status ?? STATUSES[0]} disabled={!canEdit}>
                  {STATUSES.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
            </div>
            {canEdit && <div className="row" style={{ marginTop: 10 }}><button type="submit" className="btn-line">Lưu thông tin</button></div>}
          </form>

          {canEdit && (
            <>
              <div className="ch" style={{ marginTop: 16, marginBottom: 12, paddingTop: 14, borderTop: "1px solid var(--line)" }}><h3>Thêm bài thử nghiệm</h3><span>Chọn bài thử từ danh mục đã thiết lập</span></div>
              <form action={addQuoteItemFromCatalog}>
                <input type="hidden" name="quoteId" defaultValue={quote.id} />
                <div className="row" style={{ alignItems: "flex-start" }}>
                  <div className="field" style={{ flex: 2, minWidth: 260 }}>
                    <label>Bài thử nghiệm</label>
                    <select id="ql-add-select" name="catalogId" required defaultValue="">
                      <option value="" disabled>-- Chọn bài thử từ danh mục --</option>
                      {catalog.map((c) => (<option key={c.id} value={c.id}>{c.name}{c.price ? ` (${c.price.toLocaleString("vi-VN")} đ)` : ""}</option>))}
                    </select>
                  </div>
                  <div className="field" style={{ flex: "0 0 auto" }}>
                    <label style={{ visibility: "hidden" }}>&nbsp;</label>
                    <button type="submit" className="btn-pri" id="ql-add-catalog">+ Thêm vào báo giá</button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="card" style={{ padding: 0, overflowX: "auto", marginBottom: 14 }}>
          <div className="ch" style={{ padding: "14px 18px 0" }}><h3>Hạng mục báo giá</h3><span>Click vào ô để sửa</span></div>
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Số thứ tự</th><th>Tên hạng mục</th><th>Tiêu chuẩn</th><th style={{ textAlign: "right" }}>Đơn giá</th><th style={{ textAlign: "center" }}>Số lượng</th><th style={{ textAlign: "right" }}>Thành tiền</th><th></th></tr></thead>
            <tbody id="ql-items-body">
              {items.map((it, idx) => (
                <tr key={it.id}>
                  <td>{idx + 1}</td>
                  <td>{it.name}</td>
                  <td>{it.standard ?? "—"}</td>
                  <td style={{ textAlign: "right" }}>{(it.price ?? 0).toLocaleString("vi-VN")}</td>
                  <td style={{ textAlign: "center" }}>
                    {canEdit ? (
                      <form action={updateQuoteItemQty} style={{ display: "inline" }}>
                        <input type="hidden" name="itemId" defaultValue={it.id} />
                        <input type="hidden" name="quoteId" defaultValue={quote.id} />
                        <input type="number" name="quantity" defaultValue={it.quantity ?? 1} min={1} style={{ width: 60 }} onBlur={(e) => e.currentTarget.form?.requestSubmit()} />
                      </form>
                    ) : (it.quantity ?? 1)}
                  </td>
                  <td style={{ textAlign: "right" }}>{((it.price ?? 0) * (it.quantity ?? 1)).toLocaleString("vi-VN")}</td>
                  <td>
                    {canEdit && (
                      <form action={removeQuoteItem}>
                        <input type="hidden" name="itemId" defaultValue={it.id} />
                        <input type="hidden" name="quoteId" defaultValue={quote.id} />
                        <button type="submit" className="btn-danger">Xoá</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <div id="ql-items-empty" style={{ textAlign: "center", padding: 20, color: "var(--muted)", fontSize: 13 }}>Chưa có hạng mục.</div>}
        </div>

        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ maxWidth: 300, marginLeft: "auto", display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tạm tính:</span><b id="ql-sub">{sub.toLocaleString("vi-VN")} đ</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>VAT (<span id="ql-vat-pct2">{vatPct}</span>%):</span><b id="ql-vat-amt">{vatAmt.toLocaleString("vi-VN")} đ</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid var(--pri)", paddingTop: 8, fontSize: 15, fontWeight: 700, color: "var(--pri)" }}><span>TỔNG CỘNG:</span><b id="ql-grand">{grand.toLocaleString("vi-VN")} đ</b></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingBottom: 24 }}>
          <Link href="/quote" className="btn-pri" id="ql-save-final">Lưu báo giá</Link>
          <a className="btn-line" id="ql-export-pdf" href={`/quote/${quote.id}/print`} target="_blank" rel="noreferrer">Xuất tệp tin PDF</a>
          <Link href="/quote" className="btn-line" id="ql-cancel-form">Hủy</Link>
        </div>
      </div>
    </section>
  )
}
