export type PurchaseItemRow = {
  id: string
  name: string
  quantity: number | null
  cost: number | null
  status: string | null
  note: string | null

  // Ported from the original app's 19-column purchase detail table (openPmForm / renderPurchase).
  amount: string | null // Giá trị (VNĐ), free-text formatted like the original
  price: string | null // Đơn giá
  supplier: string | null
  task: string | null // Loại task
  tfs: string | null
  jira: string | null
  pr: string | null
  po: string | null
  migo: string | null
  tinhtrang: string | null
  pic: string | null // Phòng mua hàng (nhóm ngoài lab)
  owner: string | null // Người phụ trách
  lab: string | null // Trung tâm
  tfslink: string | null
}

export const PURCHASE_STATUS_LABEL: Record<string, string> = {
  requested: "Đã yêu cầu",
  ordered: "Đã đặt hàng",
  received: "Đã nhận hàng",
  cancelled: "Đã huỷ",
  // Ported statuses used in the original renderPurchase (status column badge).
  "On-going": "Đang triển khai",
  Done: "Hoàn thành",
  Chậm: "Chậm",
  Hủy: "Hủy",
}

// Ported from pmGroupBy ('pic' | 'team' | 'lab' | 'value') in the original app.
export type PurchaseGroupBy = "lab" | "pic" | "team" | "value"

export const PURCHASE_GROUPBY_LABEL: Record<PurchaseGroupBy, string> = {
  lab: "Trung tâm",
  pic: "Phòng mua hàng",
  team: "Nhóm",
  value: "Giá trị",
}

// Ported verbatim from pmTeamOf(picRaw): matches the first segment of the pic
// text against member names (case-insensitive substring match either way) and
// returns that member's team, or "Chưa phân nhóm" if no match.
export function purchaseTeamOf(picRaw: string | null | undefined, members: Array<{ name: string; team: string | null }>): string {
  if (!picRaw) return "Chưa phân nhóm"
  const nm = picRaw.split(/[\n/]/)[0].trim()
  if (!nm) return "Chưa phân nhóm"
  const m = members.find((mm) => mm.name === nm || nm.toLowerCase().includes(mm.name.toLowerCase()) || mm.name.toLowerCase().includes(nm.toLowerCase()))
  return (m && m.team) || "Chưa phân nhóm"
}

// Ported from pmParseNum: strips all non-digit characters and parses as integer.
export function purchaseParseAmount(s: string | null | undefined): number {
  if (!s) return 0
  const t = String(s).replace(/[^0-9]/g, "")
  return t ? parseInt(t, 10) : 0
}

// Ported from pmFmtVal: formats large VNĐ amounts as "X Ty" / "X Tr".
export function purchaseFormatAmount(v: number): string {
  if (v >= 1_000_000_000) return `${(Math.round((v / 1_000_000_000) * 100) / 100).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} Tỷ`
  if (v >= 1_000_000) return `${(Math.round((v / 1_000_000) * 10) / 10).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} Tr`
  return v.toLocaleString("vi-VN")
}

// Ported from pmGroupKey. `members` is only needed/used for team grouping (pmTeamOf).
export function purchaseGroupKey(it: PurchaseItemRow, groupBy: PurchaseGroupBy, members: Array<{ name: string; team: string | null }> = []): string {
  if (groupBy === "pic") {
    const v = (it.pic || "").trim()
    return v ? v.split(/\n/)[0].trim() : "Chưa phân phòng mua hàng"
  }
  if (groupBy === "team") {
    return purchaseTeamOf(it.pic, members)
  }
  if (groupBy === "value") {
    const v = purchaseParseAmount(it.amount)
    if (!v) return "Chưa có giá trị"
    if (v < 50_000_000) return "< 50 triệu"
    if (v < 200_000_000) return "50 - 200 triệu"
    if (v < 500_000_000) return "200 - 500 triệu"
    return "> 500 triệu"
  }
  const v = (it.lab || "").trim()
  return v || "Chưa phân trung tâm"
}
