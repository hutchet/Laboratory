"use client"
import { useEffect, useMemo, useState, useTransition } from "react"
import { PageShell } from "@/shared/ui/page-shell"
import { SearchInput } from "@/shared/ui/search-input"
import { AddButton } from "@/shared/ui/add-button"
import { CustomSelect } from "@/shared/ui/custom-select"
import { DateField } from "@/shared/ui/date-field"
import { StatusBadge } from "@/shared/ui/status-badge"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { KpiCard } from "@/shared/ui/kpi-card"
import { computeSimpleTrend } from "@/shared/lib/trend"
import { DirectionIcon } from "@/shared/ui/icons"
import { Perm } from "@/shared/lib/rbac-client"
import { saveQuote, deleteQuote, addQuoteItem, updateQuoteItemQty, removeQuoteItem, exportQuoteOverviewExcel } from "../actions"
import { QUOTE_STATUS_LABEL, type QuoteRow, type Option, type CustomerOption, type TestCatalogRow } from "../types"
import { useCurrency } from "@/shared/ui/currency-provider"

// Khớp đúng hàm fmtDate() bản gốc (dd-mm-yyyy)
function fmtDate(s?: string | null) {
  if (!s) return "—"
  const p = s.slice(0, 10).split("-")
  return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : s
}
function statusTone(status: string | null): "neutral" | "info" | "success" | "danger" {
  if (status === "approved") return "success"
  if (status === "rejected") return "danger"
  if (status === "sent") return "info"
  return "neutral"
}
function itemTotal(it: { price: number | null; quantity: number | null }) {
  return (it.price ?? 0) * (it.quantity ?? 1)
}
// Khớp itemsSubtotal trong renderQuoteOverview() bản gốc (tổng qtItemPrice*qty)
function quoteItemsSubtotal(qt: QuoteRow) {
  return qt.items.reduce((s, it) => s + itemTotal(it), 0)
}
function quoteGrandTotal(qt: QuoteRow) {
  const sub = quoteItemsSubtotal(qt)
  const vat = Math.round((sub * (qt.vatPercent ?? 0)) / 100)
  return sub + vat
}

export function OverviewView({
  quotes, customers, projects, testCatalog,
}: {
  quotes: QuoteRow[]
  customers: CustomerOption[]
  projects: Option[]
  testCatalog: TestCatalogRow[]
}) {
  const { format: fmtVND } = useCurrency()
  const [q, setQ] = useState("")
  const [openId, setOpenId] = useState<string | null>(null) // "new" hoặc id báo giá đang mở
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [fCustomerId, setFCustomerId] = useState("")
  const [fProjectId, setFProjectId] = useState("")
  const [fStatus, setFStatus] = useState("draft")
  const [addSelect, setAddSelect] = useState("")
  const [addQty, setAddQty] = useState("1")

  const editing = openId && openId !== "new" ? quotes.find((it) => it.id === openId) ?? null : null

  // Port của #page-title.title-back (PurchaseView/EquipmentView): khi đã mở 1
  // báo giá, tiêu đề trên topbar trở thành nút quay lại danh sách thẻ.
  useEffect(() => {
    const el = document.getElementById("page-title")
    if (!el) return
    if (openId) {
      el.classList.add("title-back")
      el.title = "Quay lại danh sách báo giá"
      const handler = () => setOpenId(null)
      el.addEventListener("click", handler)
      return () => {
        el.classList.remove("title-back")
        el.removeAttribute("title")
        el.removeEventListener("click", handler)
      }
    }
    el.classList.remove("title-back")
    el.removeAttribute("title")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])

  const filtered = useMemo(
    () => quotes.filter((it) => !q || it.title.toLowerCase().includes(q.toLowerCase()) || (it.code ?? "").toLowerCase().includes(q.toLowerCase())),
    [quotes, q],
  )

  // ---- KPI hệ thống hoá (4 thẻ, xem shared/ui/kpi-card.tsx) ----
  const kpis = useMemo(() => ({
    total: quotes.length,
    value: quotes.reduce((s, it) => s + (it.totalAmount ?? quoteGrandTotal(it)), 0),
    approved: quotes.filter((it) => it.status === "approved").length,
    draft: quotes.filter((it) => !it.status || it.status === "draft").length,
  }), [quotes])
  const trends = useMemo(() => ({
    total: computeSimpleTrend(quotes, () => true, (it) => it.createdAt),
    approved: computeSimpleTrend(quotes, (it) => it.status === "approved", (it) => it.createdAt),
    draft: computeSimpleTrend(quotes, (it) => !it.status || it.status === "draft", (it) => it.createdAt),
  }), [quotes])

  function openNew() {
    setFCustomerId(""); setFProjectId(""); setFStatus("draft"); setAddSelect(""); setAddQty("1")
    setOpenId("new")
  }
  function openDetail(it: QuoteRow) {
    setFCustomerId(it.customerId ?? ""); setFProjectId(it.projectId ?? ""); setFStatus(it.status ?? "draft"); setAddSelect(""); setAddQty("1")
    setOpenId(it.id)
  }
  function closeDetail() { setOpenId(null) }

  function handleSubmit(formData: FormData) {
    const input = {
      id: editing?.id,
      title: String(formData.get("title") || "") || "Báo giá mới",
      code: String(formData.get("code") || "") || null,
      customerId: fCustomerId || null,
      projectId: fProjectId || null,
      quoteDate: String(formData.get("quoteDate") || "") || null,
      vatPercent: formData.get("vatPercent") ? Number(formData.get("vatPercent")) : 10,
      creator: String(formData.get("creator") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      executionDuration: String(formData.get("executionDuration") || "") || null,
      deliveryTime: String(formData.get("deliveryTime") || "") || null,
      deliveryLocation: String(formData.get("deliveryLocation") || "") || null,
      validityText: String(formData.get("validityText") || "") || null,
      paymentTerms: String(formData.get("paymentTerms") || "") || null,
      bankAccountName: String(formData.get("bankAccountName") || "") || null,
      bankName: String(formData.get("bankName") || "") || null,
      bankAccountNo: String(formData.get("bankAccountNo") || "") || null,
      bankSwiftCode: String(formData.get("bankSwiftCode") || "") || null,
      bankAddress: String(formData.get("bankAddress") || "") || null,
      generalTerms: String(formData.get("generalTerms") || "") || null,
      customerOrderNo: String(formData.get("customerOrderNo") || "") || null,
      approvalDate: String(formData.get("approvalDate") || "") || null,
      totalAmount: editing ? quoteGrandTotal(editing) : null,
      status: fStatus,
    }
    startTransition(async () => {
      await saveQuote(input)
      if (!editing) setOpenId(null)
    })
  }

  function confirmDelete() {
    if (!confirmDeleteId) return
    const id = confirmDeleteId
    startTransition(async () => {
      await deleteQuote(id)
      setConfirmDeleteId(null)
      if (openId === id) setOpenId(null)
    })
  }

  function handleAddItem() {
    if (!editing || !addSelect) return
    const cat = testCatalog[Number(addSelect)]
    if (!cat) return
    const quoteId = editing.id
    startTransition(async () => { await addQuoteItem({ quoteId, name: cat.name, standard: cat.standard, price: cat.price, quantity: Number(addQty) || 1, code: cat.code, sampleQty: cat.sampleQty, leadTime: cat.leadTime }) })
    setAddSelect(""); setAddQty("1")
  }
  function handleQtyChange(itemId: string, qty: string) {
    startTransition(async () => { await updateQuoteItemQty(itemId, Number(qty) || 1) })
  }
  function handleRemoveItem(itemId: string) {
    startTransition(async () => { await removeQuoteItem(itemId) })
  }

  // ---- Trang chi tiết / form báo giá (khớp ql-form-wrap bản gốc) ----
  if (openId) {
    const itemsSubtotal = editing ? quoteItemsSubtotal(editing) : 0
    const vatPct = editing ? editing.vatPercent ?? 10 : 10
    const vatAmt = Math.round((itemsSubtotal * vatPct) / 100)
    const grand = itemsSubtotal + vatAmt
    const selectedCustomer = customers.find((c) => c.id === fCustomerId) ?? null
    return (
      <section id="page-quote-overview">
      <PageShell
        title={editing ? editing.title : "Thêm báo giá"}
        actions={
          <span style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn-line"
              onClick={() => {
                document.body.classList.add("printing-quote-report")
                const cleanup = () => { document.body.classList.remove("printing-quote-report"); window.removeEventListener("afterprint", cleanup) }
                window.addEventListener("afterprint", cleanup)
                window.print()
                setTimeout(cleanup, 3000)
              }}
            >Xuất PDF</button>
            {editing && (
              <button
                type="button"
                className="btn-line"
                onClick={() => {
                  startTransition(async () => {
                    const { base64, filename } = await exportQuoteOverviewExcel(editing.id)
                    const link = document.createElement("a")
                    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`
                    link.download = filename
                    link.click()
                  })
                }}
              >
                Xuất Excel
              </button>
            )}
            {editing && (
              <Perm minPerm="dept_head">
                <button type="button" className="btn-danger" onClick={() => setConfirmDeleteId(editing.id)}>Xoá báo giá</button>
              </Perm>
            )}
          </span>
        }
      >
        {/* Y/c 23/07, 11:10 toi, muc 6: khoi "chi de in" mo phong dung bo cuc file Excel
            mau (Bao_gia_Proposal) - chi hien khi in/xuat PDF (xem .quote-print-doc va
            body.printing-quote-report trong globals.css), khong lam thay doi giao dien
            nhap lieu tren man hinh. */}
        {editing && (
          <div className="quote-print-doc">
            <table className="qpd-doc">
              <tbody>
                <tr className="qpd-plain">
                  <td colSpan={7}>
                    <div className="qpd-h1">CÔNG TY CỔ PHẦN VINFAST VIỆT NAM/ VINFAST VIETNAM JSC</div>
                    <div className="qpd-h2">[Địa chỉ / Address]: Khu Kinh tế Đình Vũ – Cát Hải, đảo Cát Hải, Đặc khu Cát Hải, Thành phố Hải Phòng, Việt Nam</div>
                    <div className="qpd-h2">[Mã số thuế / Tax Registration Number]: 0202357718</div>
                  </td>
                  <td colSpan={2} className="qpd-logo">VINFAST</td>
                </tr>
                <tr><td colSpan={9} className="qpd-title">BẢNG BÁO GIÁ DỊCH VỤ / SERVICES PROPOSAL</td></tr>

                <tr>
                  <td colSpan={2} className="qpd-label">Số báo giá / Proposal No.:</td>
                  <td colSpan={3}>{editing.code ?? "—"}</td>
                  <td colSpan={2} className="qpd-label">Ngày / Date:</td>
                  <td colSpan={2}>{fmtDate(editing.quoteDate)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="qpd-label">Subject / Yêu cầu:</td>
                  <td colSpan={7}>{editing.title}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="qpd-label">Project Name / Tên dự án:</td>
                  <td colSpan={7}>{projects.find((p) => p.id === fProjectId)?.name ?? "—"}</td>
                </tr>

                <tr><td colSpan={9} className="qpd-section">I. THÔNG TIN KHÁCH HÀNG (BÊN A) / CUSTOMER INFORMATION (PARTY A)</td></tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Company / Công ty</td>
                  <td colSpan={6}>{customers.find((c) => c.id === fCustomerId)?.name ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Address / Địa chỉ</td>
                  <td colSpan={6}>{selectedCustomer?.address ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Legal Representative / Người đại diện pháp luật</td>
                  <td colSpan={6}>{selectedCustomer?.legalRepresentative ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Contact person / Người liên hệ</td>
                  <td colSpan={6} className="qpd-yellow">{selectedCustomer?.contact ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Email / Địa chỉ email</td>
                  <td colSpan={6} className="qpd-yellow">{selectedCustomer?.email ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Tel / Số điện thoại</td>
                  <td colSpan={6} className="qpd-yellow">{selectedCustomer?.phone ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Invoicing Address / Thông tin xuất hóa đơn</td>
                  <td colSpan={6} className="qpd-yellow">{selectedCustomer?.invoicingAddress ?? selectedCustomer?.address ?? "—"}</td>
                </tr>

                <tr><td colSpan={9} className="qpd-section">II. NỘI DUNG CÔNG VIỆC / WORK REQUIRED</td></tr>
                <tr><td colSpan={9}>{editing.notes ?? ""}</td></tr>

                <tr><td colSpan={9} className="qpd-section">III. CHI PHÍ DỊCH VỤ / SERVICE FEES</td></tr>
                <tr>
                  <th className="qpd-th">No</th>
                  <th className="qpd-th">Code</th>
                  <th className="qpd-th">Test Item (Model)</th>
                  <th className="qpd-th">Method</th>
                  <th className="qpd-th">Sample</th>
                  <th className="qpd-th">TAT (working days)</th>
                  <th className="qpd-th">Unit price (VND)</th>
                  <th className="qpd-th">Quantity</th>
                  <th className="qpd-th">Total (VND)</th>
                </tr>
                {editing.items.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: "center" }}>—</td></tr>
                ) : editing.items.map((it, i) => (
                  <tr key={it.id}>
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td style={{ textAlign: "center" }}>{it.code ?? "—"}</td>
                    <td>{it.name}</td>
                    <td>{it.standard ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>{it.sampleQty ?? "—"}</td>
                    <td style={{ textAlign: "center" }}>{it.leadTime ?? "—"}</td>
                    <td style={{ textAlign: "right" }}>{fmtVND(it.price ?? 0)}</td>
                    <td style={{ textAlign: "right" }}>{it.quantity ?? 1}</td>
                    <td style={{ textAlign: "right" }}>{fmtVND(itemTotal(it))}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={8} className="qpd-total-label">Total Value Before VAT / Tổng giá trị trước thuế GTGT (VND)</td>
                  <td className="qpd-total-value">{fmtVND(itemsSubtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="qpd-total-label">VAT / Thuế GTGT ({vatPct}%)</td>
                  <td className="qpd-total-value">{fmtVND(vatAmt)}</td>
                </tr>
                <tr>
                  <td colSpan={8} className="qpd-total-label">Grand Total After VAT / Tổng giá trị bao gồm thuế GTGT (VND)</td>
                  <td className="qpd-total-value">{fmtVND(grand)}</td>
                </tr>

                <tr><td colSpan={9} className="qpd-section">IV. THỜI GIAN THỰC HIỆN & BÀN GIAO / TIMELINE & DELIVERY</td></tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Ngày bắt đầu dự kiến / Expected start date</td>
                  <td colSpan={6}>{fmtDate(editing.quoteDate)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Thời gian thực hiện / Execution duration</td>
                  <td colSpan={6}>{editing.executionDuration ?? "Theo thời gian test theo yêu cầu KH"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Thời gian bàn giao kết quả / Report delivery date & time</td>
                  <td colSpan={6}>{editing.deliveryTime ?? "Trong vòng 5 ngày làm việc sau khi hoàn thành thử nghiệm"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Địa điểm bàn giao / Delivery location</td>
                  <td colSpan={6}>{editing.deliveryLocation ?? "Gửi qua email & bản cứng tại địa chỉ khách hàng / via email & hard copy to customer address"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Hiệu lực báo giá / Quotation validity</td>
                  <td colSpan={6}>{editing.validityText ?? "30 ngày kể từ ngày báo giá / 30 days from quotation date"}</td>
                </tr>

                <tr><td colSpan={9} className="qpd-section">V. GHI CHÚ / REMARKS</td></tr>
                <tr><td colSpan={9}>{editing.notes ?? "Chưa có"}</td></tr>

                <tr><td colSpan={9} className="qpd-section">VI. MẪU / TÀI LIỆU KHÁCH HÀNG CUNG CẤP / SAMPLES, MATERIAL OR DOCUMENTATION TO BE SUPPLIED BY THE CUSTOMER</td></tr>
                <tr><td colSpan={9}>Mẫu phục vụ bài test theo yêu cầu mục III</td></tr>

                <tr><td colSpan={9} className="qpd-section">VIII. ĐIỀU KHOẢN THANH TOÁN / PAYMENT TERMS</td></tr>
                <tr>
                  <td colSpan={9}>{editing.paymentTerms ?? "Thanh toán 100% tổng giá trị khi kết thúc dịch vụ / Unique Payment: 100% of the expected total amount at the end of the service. Thanh toán bằng chuyển khoản, ghi rõ số báo giá / Payment by bank transfer, informing the present quotation number"}</td>
                </tr>
                <tr><td colSpan={9} className="qpd-section">THÔNG TIN TÀI KHOẢN NGÂN HÀNG / BANK ACCOUNT</td></tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Account Name / Tên tài khoản</td>
                  <td colSpan={6} className="qpd-yellow">{editing.bankAccountName ?? "CÔNG TY CỔ PHẦN VINFAST VIỆT NAM"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Bank / Ngân hàng</td>
                  <td colSpan={6} className="qpd-yellow">{editing.bankName ?? "TCB"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Account No. / Số tài khoản</td>
                  <td colSpan={6} className="qpd-yellow">{editing.bankAccountNo ?? "19040238738698"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Swift Code</td>
                  <td colSpan={6} className="qpd-yellow">{editing.bankSwiftCode ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="qpd-label">Bank Address / Địa chỉ ngân hàng</td>
                  <td colSpan={6} className="qpd-yellow">{editing.bankAddress ?? "Hội Sở chính"}</td>
                </tr>

                <tr><td colSpan={9} className="qpd-section">IX. ĐIỀU KHOẢN CHUNG / GENERAL TERMS AND CONDITIONS</td></tr>
                <tr><td colSpan={9}>{editing.generalTerms ?? "Theo hợp đồng khung đã kí giữa 2 công ty"}</td></tr>

                <tr><td colSpan={9} className="qpd-section">X. XÁC NHẬN / APPROVAL</td></tr>
                <tr>
                  <td colSpan={4} rowSpan={2} className="qpd-box qpd-label">Customer's approval / Xác nhận của khách hàng:</td>
                  <td colSpan={2} className="qpd-label">Customer Order no. / Số đơn hàng:</td>
                  <td colSpan={3} className="qpd-yellow">{editing.customerOrderNo ?? "—"}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="qpd-label">Date / Ngày:</td>
                  <td colSpan={3}>{fmtDate(editing.approvalDate)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <form id="tf-quote-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)) }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
              <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Tên báo giá *</label><input name="title" required defaultValue={editing?.title ?? ""} placeholder="VD: Báo giá thử nghiệm EMC" /></div>
              <div className="field" style={{ flex: 1, minWidth: 160 }}><label>Mã báo giá</label><input name="code" defaultValue={editing?.code ?? ""} placeholder="VD: BG-001" /></div>
              <div className="field" style={{ flex: 1, minWidth: 160 }}><label>Ngày báo giá</label><DateField name="quoteDate" defaultValue={editing?.quoteDate?.slice(0, 10) ?? ""} /></div>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
              <div className="field" style={{ flex: 1, minWidth: 200 }}><label>Khách hàng</label><CustomSelect value={fCustomerId} onChange={setFCustomerId} options={[{ value: "", label: "— Chọn khách hàng —" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]} width="100%" /></div>
              <div className="field" style={{ flex: 1, minWidth: 200 }}><label>Dự án</label><CustomSelect value={fProjectId} onChange={setFProjectId} options={[{ value: "", label: "— Không gắn dự án —" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} width="100%" /></div>
              <div className="field" style={{ flex: 1, minWidth: 160 }}><label>Trạng thái</label><CustomSelect value={fStatus} onChange={setFStatus} options={Object.entries(QUOTE_STATUS_LABEL).map(([v, l]) => ({ value: v, label: l }))} width="100%" /></div>
              <div className="field" style={{ flex: "0 0 120px" }}><label>VAT %</label><input name="vatPercent" type="number" defaultValue={editing?.vatPercent ?? 10} /></div>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
              <div className="field" style={{ flex: 1, minWidth: 200 }}><label>Người lập</label><input name="creator" defaultValue={editing?.creator ?? ""} /></div>
              <div className="field" style={{ flex: 2, minWidth: 220 }}><label>Ghi chú</label><input name="notes" defaultValue={editing?.notes ?? ""} /></div>
            </div>
          </div>

          {editing && (
            <div className="card">
              <div className="section-head" style={{ marginBottom: 10 }}>
                <h3>Thông tin bổ sung cho PDF (mục IV, VIII, IX, X)</h3>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
                <div className="field" style={{ flex: 1, minWidth: 240 }}><label>Thời gian thực hiện</label><input name="executionDuration" defaultValue={editing.executionDuration ?? "Theo thời gian test theo yêu cầu KH"} /></div>
                <div className="field" style={{ flex: 1, minWidth: 260 }}><label>Thời gian bàn giao kết quả</label><input name="deliveryTime" defaultValue={editing.deliveryTime ?? "Trong vòng 5 ngày làm việc sau khi hoàn thành thử nghiệm"} /></div>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                <div className="field" style={{ flex: 2, minWidth: 280 }}><label>Địa điểm bàn giao</label><input name="deliveryLocation" defaultValue={editing.deliveryLocation ?? "Gửi qua email & bản cứng tại địa chỉ khách hàng / via email & hard copy to customer address"} /></div>
                <div className="field" style={{ flex: 1, minWidth: 240 }}><label>Hiệu lực báo giá</label><input name="validityText" defaultValue={editing.validityText ?? "30 ngày kể từ ngày báo giá / 30 days from quotation date"} /></div>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                <div className="field" style={{ flex: 1, minWidth: 320 }}><label>Điều khoản thanh toán</label><input name="paymentTerms" defaultValue={editing.paymentTerms ?? "Thanh toán 100% tổng giá trị khi kết thúc dịch vụ / Unique Payment: 100% of the expected total amount at the end of the service. Thanh toán bằng chuyển khoản, ghi rõ số báo giá / Payment by bank transfer, informing the present quotation number"} /></div>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                <div className="field" style={{ flex: 1, minWidth: 240 }}><label>Tên tài khoản NH</label><input name="bankAccountName" defaultValue={editing.bankAccountName ?? "CÔNG TY CỔ PHẦN VINFAST VIỆT NAM"} /></div>
                <div className="field" style={{ flex: "0 0 140px" }}><label>Ngân hàng</label><input name="bankName" defaultValue={editing.bankName ?? "TCB"} /></div>
                <div className="field" style={{ flex: 1, minWidth: 200 }}><label>Số tài khoản</label><input name="bankAccountNo" defaultValue={editing.bankAccountNo ?? "19040238738698"} /></div>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                <div className="field" style={{ flex: "0 0 160px" }}><label>Swift Code</label><input name="bankSwiftCode" defaultValue={editing.bankSwiftCode ?? ""} /></div>
                <div className="field" style={{ flex: 2, minWidth: 240 }}><label>Địa chỉ ngân hàng</label><input name="bankAddress" defaultValue={editing.bankAddress ?? "Hội Sở chính"} /></div>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                <div className="field" style={{ flex: 1, minWidth: 280 }}><label>Điều khoản chung</label><input name="generalTerms" defaultValue={editing.generalTerms ?? "Theo hợp đồng khung đã kí giữa 2 công ty"} /></div>
              </div>
              <div className="row" style={{ flexWrap: "wrap", gap: 12, marginTop: 12 }}>
                <div className="field" style={{ flex: 1, minWidth: 220 }}><label>Số đơn hàng khách</label><input name="customerOrderNo" defaultValue={editing.customerOrderNo ?? ""} /></div>
                <div className="field" style={{ flex: "0 0 180px" }}><label>Ngày xác nhận</label><DateField name="approvalDate" defaultValue={editing.approvalDate?.slice(0, 10) ?? ""} /></div>
              </div>
            </div>
          )}

          {editing && (
            <div className="card">
              <div className="section-head" style={{ marginBottom: 10 }}>
                <h3>Hạng mục báo giá</h3>
              </div>
              <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <CustomSelect
                  value={addSelect}
                  onChange={setAddSelect}
                  width={420}
                  options={[{ value: "", label: "— Chọn mã bài thử để thêm —" }, ...testCatalog.map((c, i) => ({ value: String(i), label: `${c.code ?? "—"} — ${c.name} · ${c.standard ?? "—"} (${fmtVND(c.price ?? 0)})` }))]}
                />
                <input type="number" min={1} value={addQty} onChange={(e) => setAddQty(e.target.value)} style={{ width: 80 }} />
                <button type="button" className="btn-line" onClick={handleAddItem} disabled={!addSelect}>+ Thêm hạng mục</button>
              </div>
              <table className="rz-table">
                <thead><tr><th>STT</th><th>Tên bài thử</th><th>Tiêu chuẩn</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th><th></th></tr></thead>
                <tbody>
                  {editing.items.length === 0 && (<tr><td colSpan={7} style={{ textAlign: "center", opacity: 0.6, padding: 16 }}>Chưa có hạng mục nào</td></tr>)}
                  {editing.items.map((it, i) => (
                    <tr key={it.id}>
                      <td>{i + 1}</td>
                      <td><b>{it.name}</b></td>
                      <td>{it.standard ?? "—"}</td>
                      <td>{fmtVND(it.price ?? 0)}</td>
                      <td><input type="number" min={1} defaultValue={it.quantity ?? 1} onBlur={(e) => handleQtyChange(it.id, e.target.value)} style={{ width: 64 }} /></td>
                      <td><b>{fmtVND(itemTotal(it))}</b></td>
                      <td><button type="button" className="txt-act del" onClick={() => handleRemoveItem(it.id)}>Xóa</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
                <div style={{ minWidth: 260, display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                  <div className="prow"><span>Tạm tính hạng mục</span><b>{fmtVND(itemsSubtotal)}</b></div>
                  <div className="prow"><span>VAT ({vatPct}%)</span><b>{fmtVND(vatAmt)}</b></div>
                  <div className="prow" style={{ fontSize: 15 }}><span>Tổng cộng</span><b style={{ color: "var(--pri)" }}>{fmtVND(grand)}</b></div>
                </div>
              </div>
            </div>
          )}

          <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn-line" onClick={closeDetail}>{editing ? "Đóng" : "Hủy"}</button>
            <button type="submit" className="btn-pri" disabled={pending}>{pending ? "Đang lưu..." : "Lưu báo giá"}</button>
          </div>
        </form>

        <ConfirmDialog open={!!confirmDeleteId} title="Xóa báo giá?" description="Hành động này không thể hoàn tác." confirmLabel="Xóa" danger onConfirm={confirmDelete} onCancel={() => setConfirmDeleteId(null)} />
      </PageShell>
      </section>
    )
  }

  // ---- Trang danh sách: 4 thẻ KPI + lưới thẻ báo giá (cu-grid, hệ thống hoá phần 3) ----
  return (
    <section id="page-quote-overview">
    <PageShell
      title="Tổng quan báo giá"
      actions={<AddButton label="Thêm báo giá" onClick={openNew} />}
      filters={<SearchInput value={q} onChange={setQ} placeholder="Tìm báo giá..." width={240} />}
    >
      <div className="kpis-tier" style={{ marginBottom: 20 }}>
        <KpiCard label="Tổng số báo giá" value={kpis.total} tone="blue" trend={trends.total} />
        <KpiCard label="Tổng giá trị" value={fmtVND(kpis.value)} tone="neutral" />
        <KpiCard label="Đã duyệt" value={kpis.approved} tone="success" trend={trends.approved} />
        <KpiCard label="Bản nháp" value={kpis.draft} tone="warning" trend={trends.draft} />
      </div>
      <div className="section-head">
        <h3>Tất cả báo giá</h3>
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state">Chưa có báo giá nào</div>
      ) : (
        <div className="cu-grid">
          {filtered.map((it) => {
            const total = it.totalAmount ?? quoteGrandTotal(it)
            const initials = it.title.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
            return (
              <div key={it.id} className="hub-card" style={{ cursor: "pointer" }} onClick={() => openDetail(it)}>
                <div className="hub-top">
                  <span className="hub-icon">{initials || "BG"}</span>
                  <div className="hub-title"><h4>{it.title}</h4><p>{it.code ?? "—"} · {fmtDate(it.quoteDate)}</p></div>
                  <button type="button" className="sys-arrow-control hub-arrow" aria-label="Xem chi tiết" onClick={(e) => { e.stopPropagation(); openDetail(it) }}>
                    <span className="sys-arrow-glyph"><DirectionIcon name="chevronRight" size={20} /></span>
                  </button>
                </div>
                <div className="hub-tags">
                  <StatusBadge label={QUOTE_STATUS_LABEL[it.status ?? "draft"] ?? it.status ?? "—"} tone={statusTone(it.status)} />
                </div>
                <div className="hub-stats">
                  <div className="hub-stat"><b>{it.customer?.name ?? "—"}</b><span>Khách hàng</span></div>
                  <div className="hub-stat"><b>{it.project?.name ?? "—"}</b><span>Dự án</span></div>
                  <div className="hub-stat"><b>{fmtVND(total)}</b><span>Tổng tiền</span></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
    </section>
  )
}

export default OverviewView
