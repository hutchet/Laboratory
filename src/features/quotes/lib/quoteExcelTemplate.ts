// y/c item6 (10:03PM): dung file excel mau (Bao_gia_Proposal template) lam
// template cho xuat Excel cua Bao gia - Tong quan. Cau truc cot/muc theo dung
// thu tu cua file mau duoc dinh kem; du lieu dong duoc dien tu QuoteRow.
import { buildXlsx, type XlsxCell, type XlsxSheet, type XlsxCellStyle } from "@/shared/lib/xlsx-writer"
import type { QuoteRow } from "../types"

function fmtDateVN(s?: string | null): string {
  if (!s) return ""
  const p = s.slice(0, 10).split("-")
  return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : s
}

function itemTotal(it: { price: number | null; quantity: number | null }) {
  return (it.price ?? 0) * (it.quantity ?? 1)
}

const HEADER_FILL = "1D5FD6"
const SECTION_FILL = "D9E4F5"
const TABLE_HEAD_FILL = "E8ECF3"
const TOTAL_FILL = "FFF3D6"

const sectionStyle: XlsxCellStyle = { bold: true, fill: SECTION_FILL, border: true, valign: "center", fontSize: 11 }
const labelStyle: XlsxCellStyle = { border: true, valign: "center", wrap: true }
const valueStyle: XlsxCellStyle = { border: true, valign: "center", wrap: true }
const tableHeadStyle: XlsxCellStyle = { bold: true, fill: TABLE_HEAD_FILL, border: true, align: "center", valign: "center", wrap: true }
const tableCellStyle: XlsxCellStyle = { border: true, valign: "center", wrap: true }
const tableCellRightStyle: XlsxCellStyle = { border: true, valign: "center", align: "right", numFmt: "#,##0" }
const totalLabelStyle: XlsxCellStyle = { bold: true, border: true, valign: "center", fill: TOTAL_FILL }
const totalValueStyle: XlsxCellStyle = { bold: true, border: true, valign: "center", align: "right", fill: TOTAL_FILL, numFmt: "#,##0" }

/**
 * Xay dung workbook Excel cho 1 bao gia, giu dung bo cuc cua file mau
 * (VF-Vietsol Bao_gia_Proposal): header cong ty, thong tin KH, noi dung cong
 * viec, bang chi phi dich vu (No/Code/Test Item/Method/Sample/TAT/Unit
 * price/Quantity/Total), VAT + tong tien, thoi gian thuc hien, ghi chu, mau
 * & tai lieu, dieu khoan thanh toan, thong tin ngan hang, dieu khoan chung,
 * xac nhan.
 */
export function buildQuoteOverviewWorkbook(quote: QuoteRow): Buffer {
  const cells: XlsxCell[] = []
  const merges: string[] = []
  let r = 1

  function put(row: number, col: number, value: string | number | null | undefined, style?: XlsxCellStyle) {
    cells.push({ row, col, value: value ?? "", style })
  }
  function merge(range: string) {
    merges.push(range)
  }

  // ---- Header cong ty (theo dung file mau) ----
  put(1, 1, "CÔNG TY CỔ PHẦN VINFAST VIỆT NAM/ VINFAST VIETNAM JSC", { bold: true, fontSize: 13 })
  merge("A1:I1")
  put(2, 1, "[Địa chỉ / Address]: Khu Kinh tế Đình Vũ – Cát Hải, đảo Cát Hải, Đặc khu Cát Hải, Thành phố Hải Phòng, Việt Nam", { fontSize: 10 })
  merge("A2:I2")
  put(3, 1, "[Mã số thuế / Tax Registration Number]: 0202357718", { fontSize: 10 })
  merge("A3:I3")
  r = 5
  put(r, 1, "BẢNG BÁO GIÁ DỊCH VỤ / SERVICES PROPOSAL", { bold: true, fontSize: 15, align: "center", fill: HEADER_FILL, color: "FFFFFF", valign: "center" })
  merge(`A${r}:I${r}`)

  r += 2 // 7
  put(r, 1, "Số báo giá / Proposal No.:", labelStyle); merge(`A${r}:B${r}`)
  put(r, 3, quote.code ?? "", valueStyle); merge(`C${r}:E${r}`)
  put(r, 6, "Ngày / Date:", labelStyle); merge(`F${r}:G${r}`)
  put(r, 8, fmtDateVN(quote.quoteDate), valueStyle); merge(`H${r}:I${r}`)

  r += 1 // 8
  put(r, 1, "Subject / Yêu cầu:", labelStyle); merge(`A${r}:B${r}`)
  put(r, 3, quote.title, valueStyle); merge(`C${r}:I${r}`)

  r += 1 // 9
  put(r, 1, "Project Name / Tên dự án:", labelStyle); merge(`A${r}:B${r}`)
  put(r, 3, quote.project?.name ?? "", valueStyle); merge(`C${r}:I${r}`)

  r += 2 // 11
  put(r, 1, "I. THÔNG TIN KHÁCH HÀNG (BÊN A) / CUSTOMER INFORMATION (PARTY A)", sectionStyle); merge(`A${r}:I${r}`)

  const custRows: Array<[string, string]> = [
    ["Company / Công ty", quote.customer?.name ?? ""],
    ["Address / Địa chỉ", ""],
    ["Legal Representative / Người đại diện pháp luật", ""],
    ["Contact person / Người liên hệ", ""],
    ["Email / Địa chỉ email", ""],
    ["Tel / Số điện thoại", ""],
  ]
  for (const [label, value] of custRows) {
    r += 1
    put(r, 1, label, labelStyle); merge(`A${r}:C${r}`)
    put(r, 4, value, valueStyle); merge(`D${r}:I${r}`)
  }

  r += 2
  put(r, 1, "II. NỘI DUNG CÔNG VIỆC / WORK REQUIRED", sectionStyle); merge(`A${r}:I${r}`)
  r += 1
  put(r, 1, quote.notes ?? "", { ...valueStyle, wrap: true }); merge(`A${r}:I${r + 1}`)
  r += 1

  r += 2
  const feesHeaderRow = r
  put(r, 1, "III. CHI PHÍ DỊCH VỤ / SERVICE FEES", sectionStyle); merge(`A${r}:I${r}`)
  r += 1
  const tableHeaders = ["No", "Code", "Test Item (Model)", "Method", "Sample", "TAT (working days)", "Unit price (VND)", "Quantity", "Total (VND)"]
  tableHeaders.forEach((h, i) => put(r, i + 1, h, tableHeadStyle))
  const firstItemRow = r + 1
  quote.items.forEach((it, i) => {
    r += 1
    put(r, 1, i + 1, tableCellStyle)
    put(r, 2, "—", tableCellStyle)
    put(r, 3, it.name, tableCellStyle)
    put(r, 4, it.standard ?? "—", tableCellStyle)
    put(r, 5, "—", tableCellStyle)
    put(r, 6, "—", tableCellStyle)
    put(r, 7, it.price ?? 0, tableCellRightStyle)
    put(r, 8, it.quantity ?? 1, { ...tableCellStyle, align: "right" })
    put(r, 9, itemTotal(it), tableCellRightStyle)
  })
  if (quote.items.length === 0) {
    r += 1
    put(r, 1, "—", tableCellStyle); merge(`A${r}:I${r}`)
  }
  const subtotal = quote.items.reduce((s, it) => s + itemTotal(it), 0)
  const vatPct = quote.vatPercent ?? 10
  const vatAmt = Math.round((subtotal * vatPct) / 100)
  const grand = quote.totalAmount ?? subtotal + vatAmt

  r += 1
  put(r, 1, "Total Value Before VAT / Tổng giá trị trước thuế GTGT (VND)", totalLabelStyle); merge(`A${r}:H${r}`)
  put(r, 9, subtotal, totalValueStyle)
  r += 1
  put(r, 1, `VAT / Thuế GTGT (${vatPct}%)`, totalLabelStyle); merge(`A${r}:H${r}`)
  put(r, 9, vatAmt, totalValueStyle)
  r += 1
  put(r, 1, "Grand Total After VAT / Tổng giá trị bao gồm thuế GTGT (VND)", totalLabelStyle); merge(`A${r}:H${r}`)
  put(r, 9, grand, totalValueStyle)

  r += 2
  put(r, 1, "IV. THỜI GIAN THỰC HIỆN & BÀN GIAO / TIMELINE & DELIVERY", sectionStyle); merge(`A${r}:I${r}`)
  const timelineRows: Array<[string, string]> = [
    ["Ngày bắt đầu dự kiến / Expected start date", fmtDateVN(quote.quoteDate)],
    ["Thời gian thực hiện / Execution duration", "Theo thời gian test theo yêu cầu KH"],
    ["Thời gian bàn giao kết quả / Report delivery date & time", "Trong vòng 5 ngày làm việc sau khi hoàn thành thử nghiệm"],
    ["Địa điểm bàn giao / Delivery location", "Gửi qua email & bản cứng tại địa chỉ khách hàng / via email & hard copy to customer address"],
    ["Hiệu lực báo giá / Quotation validity", "30 ngày kể từ ngày báo giá / 30 days from quotation date"],
  ]
  for (const [label, value] of timelineRows) {
    r += 1
    put(r, 1, label, labelStyle); merge(`A${r}:C${r}`)
    put(r, 4, value, valueStyle); merge(`D${r}:I${r}`)
  }

  r += 2
  put(r, 1, "V. GHI CHÚ / REMARKS", sectionStyle); merge(`A${r}:I${r}`)
  r += 1
  put(r, 1, quote.notes ?? "Chưa có", valueStyle); merge(`A${r}:I${r}`)

  r += 2
  put(r, 1, "VI. MẪU / TÀI LIỆU KHÁCH HÀNG CUNG CẤP / SAMPLES, MATERIAL OR DOCUMENTATION TO BE SUPPLIED BY THE CUSTOMER", sectionStyle); merge(`A${r}:I${r}`)
  r += 1
  put(r, 1, "Mẫu phục vụ bài test theo yêu cầu mục III", valueStyle); merge(`A${r}:I${r}`)

  r += 2
  put(r, 1, "VIII. ĐIỀU KHOẢN THANH TOÁN / PAYMENT TERMS", sectionStyle); merge(`A${r}:I${r}`)
  r += 1
  put(r, 1, "Thanh toán 100% tổng giá trị khi kết thúc dịch vụ / Unique Payment: 100% of the expected total amount at the end of the service.\nThanh toán bằng chuyển khoản, ghi rõ số báo giá / Payment by bank transfer, informing the present quotation number", { ...valueStyle, wrap: true }); merge(`A${r}:I${r + 1}`)
  r += 1

  r += 2
  put(r, 1, "THÔNG TIN TÀI KHOẢN NGÂN HÀNG / BANK ACCOUNT", sectionStyle); merge(`A${r}:I${r}`)
  const bankRows: Array<[string, string]> = [
    ["Account Name / Tên tài khoản", "CÔNG TY CỔ PHẦN VINFAST VIỆT NAM"],
    ["Bank / Ngân hàng", "TCB"],
    ["Account No. / Số tài khoản", "19040238738698"],
    ["Swift Code", ""],
    ["Bank Address / Địa chỉ ngân hàng", "Hội Sở chính"],
  ]
  for (const [label, value] of bankRows) {
    r += 1
    put(r, 1, label, labelStyle); merge(`A${r}:C${r}`)
    put(r, 4, value, valueStyle); merge(`D${r}:I${r}`)
  }

  r += 2
  put(r, 1, "IX. ĐIỀU KHOẢN CHUNG / GENERAL TERMS AND CONDITIONS", sectionStyle); merge(`A${r}:I${r}`)
  r += 1
  put(r, 1, "Theo hợp đồng khung đã kí giữa 2 công ty", valueStyle); merge(`A${r}:I${r + 1}`)
  r += 1

  r += 2
  put(r, 1, "X. XÁC NHẬN / APPROVAL", sectionStyle); merge(`A${r}:I${r}`)
  r += 1
  put(r, 1, "Customer's approval / Xác nhận của khách hàng:", labelStyle); merge(`A${r}:D${r + 3}`)
  put(r, 6, "Customer Order no. / Số đơn hàng:", labelStyle); merge(`F${r}:I${r}`)
  r += 3
  put(r, 6, "Date / Ngày:", labelStyle); merge(`F${r}:G${r}`)

  const sheet: XlsxSheet = {
    name: "Bao gia",
    cells,
    merges,
    colWidths: { 1: 16, 2: 10, 3: 22, 4: 16, 5: 12, 6: 14, 7: 16, 8: 10, 9: 16 },
  }
  void feesHeaderRow
  void firstItemRow
  return buildXlsx(sheet)
}
