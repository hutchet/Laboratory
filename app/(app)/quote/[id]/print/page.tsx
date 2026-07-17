import { db } from "@/lib/db"
import { notFound } from "next/navigation"

export const runtime = 'edge'

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const quote = await db.quote.findUnique({ where: { id }, include: { catalogItems: true, customer: true, project: true } })
  if (!quote) notFound()

  const items = quote.catalogItems
  const sub = items.reduce((s, i) => s + (i.price ?? 0) * (i.quantity ?? 1), 0)
  const vatPct = quote.vatPercent ?? 10
  const vatAmt = sub * (vatPct / 100)
  const grand = sub + vatAmt

  return (
    <html lang="vi">
      <body style={{ fontFamily: "Arial, sans-serif", padding: 32, color: "#111" }}>
        <script dangerouslySetInnerHTML={{ __html: "window.onload = function(){ window.print(); }" }} />
        <h1 style={{ fontSize: 20 }}>BÁO GIÁ {quote.code ? `- ${quote.code}` : ""}</h1>
        <p><b>Tên báo giá:</b> {quote.title}</p>
        <p><b>Khách hàng:</b> {quote.customer ? quote.customer.name : "—"}</p>
        <p><b>Dự án:</b> {quote.project ? quote.project.name : "—"}</p>
        <p><b>Người lập:</b> {quote.creator ?? "—"}</p>
        <p><b>Ngày lập:</b> {quote.quoteDate ? new Date(quote.quoteDate).toLocaleDateString("vi-VN") : "—"}</p>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #333" }}>
              <th style={{ textAlign: "left", padding: 6 }}>STT</th>
              <th style={{ textAlign: "left", padding: 6 }}>Tên hạng mục</th>
              <th style={{ textAlign: "left", padding: 6 }}>Tiêu chuẩn</th>
              <th style={{ textAlign: "right", padding: 6 }}>Đơn giá</th>
              <th style={{ textAlign: "center", padding: 6 }}>SL</th>
              <th style={{ textAlign: "right", padding: 6 }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={it.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: 6 }}>{idx + 1}</td>
                <td style={{ padding: 6 }}>{it.name}</td>
                <td style={{ padding: 6 }}>{it.standard ?? "—"}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{(it.price ?? 0).toLocaleString("vi-VN")}</td>
                <td style={{ padding: 6, textAlign: "center" }}>{it.quantity ?? 1}</td>
                <td style={{ padding: 6, textAlign: "right" }}>{((it.price ?? 0) * (it.quantity ?? 1)).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ maxWidth: 300, marginLeft: "auto", marginTop: 20 }}>
          <p style={{ display: "flex", justifyContent: "space-between" }}><span>Tạm tính:</span><b>{sub.toLocaleString("vi-VN")} đ</b></p>
          <p style={{ display: "flex", justifyContent: "space-between" }}><span>VAT ({vatPct}%):</span><b>{vatAmt.toLocaleString("vi-VN")} đ</b></p>
          <p style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #333", paddingTop: 6, fontWeight: 700 }}><span>TỔNG CỘNG:</span><b>{grand.toLocaleString("vi-VN")} đ</b></p>
        </div>
        <p style={{ marginTop: 30, fontSize: 12, color: "#666" }}>Ghi chú: {quote.notes ?? "—"}</p>
      </body>
    </html>
  )
}
