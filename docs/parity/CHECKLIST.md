# Checklist đối chiếu 100% HTML gốc <-> TaskFlow v2

Nguồn: /data/taskflow_original.html (8510 dòng). Trạng thái: ✅ đã làm & khớp | ⚠️ có bản đơn giản, CHƯA khớp | ❌ chưa làm.
Không mục nào được đánh ✅ nếu chỉ dựa vào suy luận — phải đối chiếu đúng dòng code gốc.

**Quy trình audit bắt buộc trước khi đổi trạng thái bất kỳ mục nào thành ✅: xem docs/parity/AUDIT-METHOD.md.**

## 0. Khung sườn toàn cục (áp dụng mọi trang)
- [ ] ❌ Sidebar `<aside class="side">` cố định + top bar: ô tìm kiếm `#topsearch`, chuông thông báo `#bell` + panel `#notif-panel` (đếm task quá hạn, nút xóa hết), avatar người dùng `.me`
- [ ] ❌ Modal overlay dùng chung `#modal` (modal-title/modal-body/modal-x) cho toàn bộ form popup
- [ ] ❌ Bộ dropdown chip dùng chung `renderFilterDropdown()` (dùng ở Tasks, Samples, Equipment, Purchase...)
- [ ] ❌ Cột bảng resize được (`col-resizer`, `ensureTableResizers`)
- [ ] ❌ Chế độ "Chỉnh sửa" bật/tắt + chọn nhiều dòng + xóa hàng loạt (`row-chk`, `selall-chk`, `*-bulk-del`) dùng ở nhiều bảng (Purchase, Quote catalog/matrix/personnel/depreciation/variable, Equipment mgmt)
- [ ] ❌ Biểu đồ SVG tự vẽ: donut (`#donut`, `#plan-donut-*`, `#ap-donut-*`, `#pvd-donut`), bubble chart (`.bubble-chart`), bal-chart (cột ngang có tooltip)
- [ ] ❌ Phân quyền hiển thị theo `data-perm="admin|manager|technician"` ẩn/hiện nút theo vai trò đang thao tác (khác RBAC ở backend — đây là RBAC áp ở UI theo vai trò giả lập)

## 1. Dashboard (page-dash)
- [ ] ⚠️ 3 KPI hero card (Dự án/nội bộ %, Công việc đang hoạt động, Dự án rủi ro) — có số liệu nhưng thiếu icon/trend giống gốc
- [ ] ❌ Biểu đồ cột "Công việc/hạn chốt" (`due-bars`) + control zoom
- [ ] ❌ Spotlight dự án cần chú ý nhất (`dash-spotlight`) với avatar nhóm + 2 nút hành động
- [ ] ❌ Donut "Phân bố giá trị dự án" theo tháng (`pvd-donut` + `pvd-month-sel` + legend)
- [ ] ❌ Stack bar "Phân bổ trạng thái" (đang làm/hoàn thành/quá hạn) + đếm số lượng
- [ ] ❌ Bubble chart "Khối lượng công việc" theo thành viên (`team-bubbles`)
- [ ] ❌ Donut "Mức ưu tiên" (cao/trung/thấp) + progress bar
- [ ] ⚠️ 4 paycard "Thẻ trạng thái" (mẫu đang kiểm thử, tiến độ kế hoạch TB, khách hàng, giá trị báo giá)
- [ ] ⚠️ 4 paycard "Tình hình thiết bị" (tổng, sẵn sàng, cần kiểm định sớm, quá hạn)
- [ ] ❌ Bảng "3 công việc quá hạn lâu nhất"

## 2. Tasks (page-tasks) — P2, đã build CRUD
- [x] ✅ Form thêm/sửa (tên, dự án, phụ trách, hạn chốt, ưu tiên, trạng thái, ghi chú)
- [ ] ❌ Chip lọc dùng `renderFilterDropdown`
- [ ] ❌ Nút "⬇ Xuất Excel" (`btn-csv`)
- [x] ✅ Bảng có sort theo cột (`data-sort`) — cần xác nhận lại đã có sort chưa

## 3. Projects (page-projects) — P3
- [x] ✅ CRUD dự án cơ bản (tên, khách hàng, trung tâm)
- [ ] ❌ 4 KPI card (đang hoạt động/đang thực hiện/hoàn thành/rủi ro) auto-tổng hợp từ Tasks
- [ ] ❌ Trạng thái/ưu tiên/tiến độ/deadline tự tổng hợp từ task cùng tên dự án (logic phái sinh, KHÔNG lưu field riêng)
- [ ] ❌ Phân trang (`proj-pager`)

## 4. Customers (page-customers) — P3
- [x] ✅ CRUD (tên, liên hệ, email, sđt, địa chỉ, ghi chú)
- [ ] ⚠️ Field "Giá trị HĐ (VNĐ)" — cần xác nhận có trong schema chưa
- [ ] ❌ 4 KPI card tổng hợp (tổng KH, đang có dự án, tổng dự án liên quan, tổng giá trị HĐ)

## 5. Testing Centers (page-centers) — P3
- [x] ✅ CRUD (tên, quản lý, sđt, địa chỉ, ghi chú)
- [ ] ❌ 4 KPI card tổng hợp (tổng trung tâm, dự án liên kết, giá trị dự án, khách hàng liên quan)

## 6. Samples (page-samples) — P3
- [x] ✅ CRUD pack mẫu cơ bản
- [x] ✅ Field: mã mẫu, số seri, số lượng, ngày nhận, vị trí lưu trợ, trạng thái mẫu (auto: received/testing/completed/returned)
- [x] ✅ Group theo dự án, thẻ có thể thu gọn, thanh tiến độ %/nhóm
- [x] ✅ KPI card (kpis-tier, đặt TRƯC toolbar theo chuẩn Khách hàng/Dự án/Trung tâm) + chip lọc trạng thái + filter theo khách hàng
- [x] ✅ Mẫu tự động đưa vào Kế hoạch như 1 TestPack khi tạo/sửa (không cần bấm “+ Thêm mẫu” thủ công ở trang Kế hoạch nữa) — syncSampleToTestPack() trong samples/actions.ts
## 7. Quality (page-quality) — P5, ĐÃ XÁC NHẬN THIẾU
- [ ] ❌ Checklist ISO 17025 theo clause, tick tự động dựa trên dữ liệu hiệu chuẩn thiết bị thật (`qlChecklistAutoState`) — hiện chỉ tick tay
- [x] ⚠️ 4 KPI card (quá hạn/sắp đến hạn/còn hạn/audit log)
- [ ] ⚠️ Bảng lịch tái hiệu chuẩn (tên, mã, hiệu chuẩn gần nhất, chu kỳ, hạn tái hiệu chuẩn, trạng thái màu) — cần xác nhận đã tính đúng ngày hạn tái hiệu chuẩn từ calLast+calInterval
- [ ] ❌ Audit trail lọc theo `entity` (equipment/sample/plan/booking/member/project) + tìm kiếm

## 8. Quotes (6 trang: overview/catalog/matrix/personnel/depreciation/variable) — P4
- [ ] ❌ Overview: ring chart phân tích (tổng báo giá, tổng giá trị, giá trị TB, số KH, % tháng này)
- [x] ⚠️ Form báo giá: khách hàng, dự án, số báo giá, ngày lập, VAT%, người lập, ghi chú
- [x] ⚠️ Bảng hạng mục thêm từ danh mục (catalog) + tính tạm tính/VAT/tổng cộng
- [ ] ❌ Xuất PDF báo giá (`ql-export-pdf`)
- [ ] ❌ Catalog: bảng bài thử (mã, tên, tiêu chuẩn, cấp mẫu, thời gian xử lý, đơn giá) + resize cột + bulk delete + edit-toggle
- [ ] ❌ Matrix: quản lý theo trung tâm (center cards + detail), "dòng máy"
- [ ] ❌ Personnel: đơn giá nhân sự theo vai trò (KTV/Kỹ sư/Trưởng nhóm/Quản lý, giờ/vai trò/bài thử, phụ phí chung%), nút "Đặt lại theo file gốc"
- [ ] ❌ Depreciation: khấu hao thiết bị (nhóm tài sản, tổng giá trị, số năm KH, khấu hao/giờ)
- [ ] ❌ Variable: chi phí biến đổi khác (loại chi phí, mô tả, số tiền)

## 9. Members (page-members) — P3
- [x] ✅ CRUD (họ tên, mã NV, email, giới tính, nhóm — có datalist gợi ý nhóm, vai trò truy cập)
- [ ] ❌ Adminbar hiển thị người dùng hiện tại + badge "★ Quản trị viên"

## 10. Equipment + Booking (page-equipment, page-analytics) — P4
- [x] ⚠️ CRUD thiết bị (tên, mã, danh mục, hãng, model, số lượng, trạng thái, trung tâm, phòng, diện tích, công suất, spec)
- [x] ⚠️ Field hiệu chuẩn: ngày hiệu chuẩn gần nhất, chu kỳ, số chứng chỉ, đơn vị hiệu chuẩn — cần xác nhận đủ 4 field
- [ ] ❌ Lịch đặt theo khung giờ dạng lưới ngày/tháng/năm (`eq-grid-wrap`) + điều hướng ngày trước/sau/hôm nay + chip danh mục
- [ ] ❌ Center cards + detail theo trung tâm (giống Purchase/Quote matrix pattern)
- [ ] ❌ 4 KPI card riêng cho trang Booking (tổng thiết bị, sẵn sàng, đang bảo trì, lượt đặt trong ngày)

## 11. Test Plan (page-plan) — P5, ĐÃ XÁC NHẬN THIẾU NẶNG
- [ ] ❌ Card tổng quan nhiều dự án (`plan-card-overview`) trước khi vào chi tiết 1 kế hoạch
- [ ] ❌ 4 KPI (tổng bài thử, đạt, không đạt, đang chạy)
- [ ] ❌ 2 donut (tiến độ trạng thái, tỷ lệ đạt/không đạt) + khối lượng theo PIC + tiến độ theo mẫu + tỷ lệ theo ưu tiên
- [ ] ❌ **Gantt chart thật** (`plan-gantt-wrap`, `renderGanttChart`) mỗi mẫu 1 chuỗi bài thử tuần tự, có điều hướng theo ngày + zoom
- [ ] ❌ Quản lý mẫu + bài thử lồng nhau (pack -> nhiều test item)
- [ ] ❌ Bảng chi tiết 19 cột xuất Excel/PDF (mã báo cáo, mẫu, tên bài thử, ưu tiên, tiêu chuẩn, cấp mẫu, nhóm, thiết bị, PIC, kế hoạch bắt đầu/kết thúc, thực tế bắt đầu/kết thúc, kết quả, %HT, ghi chú)
- [x] ⚠️ Model TestItem cơ bản đã có nhưng thiếu UI trên

## 12. Audit Plan ISO 17025 (page-auditplan) — P5, ĐÃ XÁC NHẬN THIẾU NẶNG
- [ ] ❌ Nhiều audit plan (list card `ap-plan-cards`) + tìm kiếm + tạo mới, không phải 1 plan cố định
- [ ] ❌ 4 KPI (tổng đầu việc, hoàn thành, đang triển khai, quá hạn)
- [ ] ❌ Donut trạng thái + tỷ lệ hoàn thành + số phase + khối lượng theo PIC
- [ ] ❌ **Gantt chart thật** theo phase, có legend 6 màu (hoàn thành/đang triển khai/quá hạn/chưa bắt đầu/kế hoạch nhạt/vượt kế hoạch — sọc)
- [ ] ❌ Danh sách theo hạng mục (phase) + thêm hạng mục
- [ ] ❌ Bảng chi tiết đầu việc (No, đầu việc, PIC, bắt đầu/kết thúc KH, bắt đầu/kết thúc TT, thời lượng, trạng thái, ghi chú) + xuất Excel
- [ ] ❌ Seed data gốc ISO 17025 (16 nhóm hạng mục, ~50 task, dùng làm plan mẫu "iso17025")

## 13. Purchase (page-purchase) — P5, ĐÃ XÁC NHẬN THIẾU NẶNG
- [ ] ❌ Overview dạng hub-card nhóm theo lab/nhóm (group by), mỗi card có tiến độ %, số hoàn thành/đang triển khai/chậm
- [ ] ❌ Bấm vào card mở bảng chi tiết nhóm
- [ ] ❌ Bảng chi tiết **19 cột**: STT, Tên hạng mục, Giá trị, Đơn giá, Nhà cung cấp, Loại task, TFS, Jira (link), PR, PO, MIGO, Tình trạng, Người phụ trách, Phòng mua hàng, Trung tâm, Trạng thái (badge màu Done/On-going/Chậm/Hủy), TFS Link, Thao tác
- [ ] ❌ Chọn nhiều dòng + xóa hàng loạt, toggle chỉnh sửa, resize cột
- [x] ⚠️ Model PurchaseItem hiện chỉ có 5 field (name/quantity/cost/status/note) — THIẾU 14 field so với gốc

## 14. Settings (page-settings) — P5, ĐÃ XÁC NHẬN THIẾU
- [ ] ❌ Chọn vai trò giả lập trong phiên (`set-active-role`: admin/manager/technician/viewer) để xem/thao tác theo quyền đó — khác với RBAC user thật
- [ ] ❌ Theme sáng/tối + chọn phông chữ + nút khôi phục mặc định
- [ ] ❌ Backup toàn bộ dữ liệu ra file JSON (`set-backup-btn`)
- [ ] ❌ Khôi phục dữ liệu từ file JSON (`set-restore-btn` + input file)
- [ ] ❌ Xóa toàn bộ dữ liệu (double-confirm) — với app có DB thật cần thiết kế lại thành "xóa dữ liệu workspace" có phân quyền admin nghiêm ngặt hơn
- [ ] N/A Thư mục Database offline (File System Access API) — tính năng đặc thù trình duyệt/localStorage, KHÔNG áp dụng cho app có server DB thật; cần thống nhất bỏ qua có chủ đích (ghi rõ lý do, không phải bỏ sót)

## 15. Report (page-report) — P5, SAI MÔ HÌNH DỮ LIỆU
- [ ] ❌ Danh sách dự án (liên kết từ Projects) dạng card, bấm vào để mở bảng nhập báo cáo riêng cho dự án đó
- [ ] ❌ Bảng báo cáo dạng **spreadsheet với cột tự định nghĩa** (COLS), thêm/xóa dòng tự do, lưu theo từng dự án (không phải model Report title/content hiện tại)
- [x] ⚠️ Model Report hiện tại (title/content/projectId) — cần thiết kế lại thành ReportRow theo project + cột động, hoặc tối thiểu cột cố định đúng theo bản gốc

