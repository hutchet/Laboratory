# Phương án audit chống lọt lỗi (v1 — sau đợt sửa Kế hoạch/Mẫu ngày 21/07)

Mục tiêu: mỗi khi build/sửa lại 1 trang, chạy đủ 4 bước dưới đây TRƯỚC khi báo hoàn thành,
thay vì chỉ nhìn ảnh chụp màn hình hoặc nhớ lại code cũ. Đây là quy trình bắt buộc, không phải gợi ý.

## Bước 1 — Đối chiếu cấu trúc thẻ/khối (Card inventory)
Với `taskflow_original.html`, `grep` đúng section `#page-<ten-trang>` để liệt kê TOÀN BỘ card/khối
theo đúng THỨ TỰ xuất hiện trong DOM gốc. Ghi ra danh sách có thứ tự (ví dụ Kế hoạch: card tổng quan
dự án → KPI → tổng quan tiến độ & kết quả → Gantt → mẫu & bài thử → bảng xuất). So khớp thứ tự này
với JSX hiện tại theo đúng thứ tự render, không chỉ so sánh nội dung có/thiếu.

## Bước 2 — Đối chiếu field-by-field cho MỌI popup form
Với mỗi `open*Form()`/modal trong HTML gốc, liệt kê toàn bộ input/select/textarea theo id (ví dụ
`openTestItemForm` có 18 field). Với FormModal hiện tại trong React, liệt kê toàn bộ `name=` field.
Diff 2 danh sách — field thiếu, field dư, field sai loại (select vs input) đều phải ghi vào CHECKLIST.
Không được kết luận "đã khớp" nếu chưa liệt kê đủ 2 danh sách cạnh nhau.

## Bước 3 — Kiểm tra hành vi phái sinh/tự động (derived logic)
Grep các hàm tính toán trong HTML gốc (auto-status, tính ngày kết thúc dự kiến, cảnh báo trùng lịch...)
và xác nhận logic tương ứng tồn tại trong `actions.ts`/component hiện tại — không chỉ có field mà
phải có ĐÚNG công thức. Ví dụ: mẫu đưa vào kế hoạch tự động (không cần user tạo tay), ngày kết thúc
dự kiến = ngày bắt đầu + thời lượng, cảnh báo lệch lịch trong cùng 1 mẫu.

## Bước 4 — Kiểm tra kỹ thuật trước khi đóng gói (không có tsc trong sandbox)
- `node -e` đếm số `{`/`}` và `(`/`)` phải bằng nhau cho MỌI file vừa sửa.
- `grep -c $'\xEF\xBF\xBD'` (ký tự thay thế UTF-8 lỗi) trên MỌI file vừa sửa — phải bằng 0. Đây là
  cách phát hiện lỗi "mojibake" (VD: "kh??ng đạt") mà mắt thường có thể lướt qua khi đọc code nhanh.
- Cập nhật `docs/parity/CHECKLIST.md`: đổi trạng thái ❌/⚠️ → ✅ CHỈ sau khi bước 1-3 đã đối chiếu
  xong, không đổi trạng thái dựa trên cảm giác "chắc là xong rồi".

## Áp dụng lần này (trang Kế hoạch + Quản lý mẫu, 21/07)
- Bước 1: đối chiếu `#page-plan` (dòng 3745-3823 HTML gốc) → xác nhận thứ tự card đúng, phát hiện
  card KPI/tổng quan không lệch thứ tự nhưng khối donut bị xuống nhiều hàng (CSS) — đã fix bằng class
  `.pl-overview-row` riêng, không sửa `.pl-donut-wrap` gốc (dùng chung với trang Thiết bị) để tránh vỡ nơi khác.
- Bước 2: đối chiếu `openTestItemForm` (dòng 7324-7449, 18 field) với form React (trước đó chỉ có 12
  field, thiếu mã báo cáo/cấp độ mẫu/nhóm phụ trách/cảnh báo trùng lịch/ghi chú) → đã bổ sung đủ.
- Bước 3: xác nhận mẫu ở trang Quản lý mẫu phải tự đưa vào Kế hoạch — đã thêm `syncSampleToTestPack()`
  chạy trong `saveSample()` (tạo/cập nhật) và cascade-delete khi xoá mẫu.
- Bước 4: đã chạy đủ 2 kiểm tra brace/paren-balance + grep mojibake trên `PlanView.tsx`,
  `SamplesView.tsx`, `globals.css` trước khi đóng gói bản ar — phát hiện và fix thêm 2 lỗi mojibake
  còn sót (dòng "liên kết", "không đạt") mà lần build trước bỏ lọt.
