// Port 1:1 tu COLS trong openReport() ban goc (dong 5437 taskflow_original.html).
// Day la 6 cot CO DINH, khong phai cau hinh cot tuy y.
export type ReportColumnKey = "testName" | "standard" | "steps" | "criteria" | "equipment" | "calibration"

export const REPORT_COLUMNS: Array<{ key: ReportColumnKey; label: string }> = [
  { key: "testName", label: "Tên bài thử nghiệm" },
  { key: "standard", label: "Tên tiêu chuẩn" },
  { key: "steps", label: "Các bước thử nghiệm" },
  { key: "criteria", label: "Tiêu chí đánh giá" },
  { key: "equipment", label: "Thiết bị sử dụng" },
  { key: "calibration", label: "Thông số hiệu chuẩn" },
]

export type ReportRowData = Record<ReportColumnKey, string>

export type ReportRowRecord = { id: string; position: number } & ReportRowData

export type ReportProjectCard = { id: string; name: string; rowCount: number; createdAt: string }

export function emptyReportRow(): ReportRowData {
  return { testName: "", standard: "", steps: "", criteria: "", equipment: "", calibration: "" }
}
