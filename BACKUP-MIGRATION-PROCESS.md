# Bước 6 — Backup, Point-in-time Recovery & Quy trình migration an toàn

Tài liệu này là quy trình vận hành (không phải code) cho việc backup dữ liệu và thay đổi
schema Postgres (Neon) an toàn từ giờ về sau. Đây là bản viết sẵn để Hermes AI hoặc bạn
trực tiếp thực hiện trên Neon/Vercel dashboard — sandbox của tôi không có kết nối
internet nên không thể tự bấm các bước này.

## 1. Bật Point-in-time Recovery (PITR) trên Neon

1. Đăng nhập [Neon Console](https://console.neon.tech) bằng tài khoản đang quản lý project `neondb` (dùng chung `DATABASE_URL` đã cấu hình trong Vercel).
2. Vào project → tab **Settings** → **Backup & restore** (hoặc **Branches** tuỳ phiên bản UI Neon hiện tại).
3. Neon lưu lịch sử thay đổi (restore window) theo gói đang dùng:
   - Gói Free: 24 giờ history — đủ để rollback lỗi phát hiện trong ngày, KHÔNG đủ cho lỗi phát hiện muộn hơn.
   - Gói Launch/Scale: có thể tăng lên 7-30 ngày.
   - **Việc cần làm**: kiểm tra gói hiện tại của project, nếu đang ở Free và ngân sách cho phép, nâng cấp lên gói có history dài hơn (khuyến nghị tối thiểu 7 ngày) trước khi đưa dữ liệu thật (Bước 5) vào Production.
4. Không cần cấu hình thêm gì để "bật" — Neon tự động ghi lại history liên tục theo cửa sổ retention của gói. Việc "bật" thực chất là chọn gói/độ dài retention phù hợp.
5. Ghi lại (ví dụ lưu vào trang Notion theo dõi dự án) ngày bắt đầu có retention đủ dài, để biết mốc sớm nhất có thể rollback.

## 2. Snapshot chủ động trước mỗi lần nâng cấp lớn

Ngoài PITR tự động, trước MỖI lần chạy migration schema hoặc thay đổi lớn:

1. Trong Neon Console, vào **Branches** → tạo 1 branch mới từ branch `production` tại thời điểm hiện tại (Neon cho tạo branch tức thời, chi phí thấp, dùng làm bản snapshot có thể query lại).
2. Đặt tên branch theo quy tắc: `backup-YYYY-MM-DD-<mô-tả-ngắn>` (ví dụ `backup-2026-07-18-before-purchase-schema-fix`).
3. Giữ lại branch backup tối thiểu 30 ngày trước khi xoá (theo đúng nguyên tắc đã ghi trong roadmap ở mục 3.3).
4. Nếu Neon project đang ở gói không hỗ trợ nhiều branch, thay thế bằng: chạy `pg_dump` (qua Hermes AI hoặc máy có mạng) xuất file `.sql` và lưu file đó làm attachment trên trang Notion theo dõi dự án, cùng chỗ với các file code.

## 3. Quy trình "additive-first" cho mọi thay đổi schema (Prisma)

Áp dụng cho MỌI lần sửa `prisma/schema.prisma` từ giờ về sau, không chỉ lần này:

1. **Không xoá/đổi tên cột hoặc bảng trong migration đầu tiên.** Chỉ thêm cột mới (nullable hoặc có default) / bảng mới.
2. Chạy `npx prisma migrate dev --name <tên-mô-tả>` ở môi trường Development trước; kiểm tra file SQL sinh ra trong `prisma/migrations/` chỉ chứa lệnh `ADD COLUMN`/`CREATE TABLE`, không có `DROP COLUMN`/`DROP TABLE`/`ALTER COLUMN ... NOT NULL` trên cột đã có dữ liệu.
3. Deploy migration đó lên Preview (branch Neon riêng của Preview) trước, chạy thử toàn bộ luồng nghiệp vụ liên quan.
4. Chỉ sau khi Preview ổn định, chạy `npx prisma migrate deploy` (hoặc `npx prisma db push` nếu chưa dùng migration có version) lên Production, dùng đúng `DATABASE_URL` Production đã cấu hình sẵn trong Vercel.
5. Nếu cột mới cần backfill dữ liệu từ cột cũ (ví dụ tách `note` JSON tạm của PurchaseItem — xem mục 4 dưới đây — ra cột riêng), viết 1 script backfill riêng (giống mẫu `scripts/migrate-localstorage.ts`), chạy ở chế độ dry-run trước, đối chiếu số lượng, rồi mới chạy `--commit`.
6. **Chỉ xoá cột/bảng cũ ở một migration RIÊNG, sau khi đã xác nhận** (tối thiểu 1-2 tuần chạy ổn định trên Production) rằng không còn code nào đọc/viết cột cũ đó nữa.
7. Không cho phép migration tự chạy trong lúc `next build`/deploy tự động — luôn chạy migration là 1 bước thủ công/được duyệt riêng, tách khỏi pipeline build (đúng như đã ghi trong roadmap mục 3.2).

## 4. Việc additive cụ thể đã phát hiện cần làm (từ khi viết `scripts/migrate-localstorage.ts`)

Khi viết script di trú dữ liệu localStorage → Postgres (Bước 5), phát hiện `model PurchaseItem`
trong schema hiện tại (`id, name, quantity, cost, status, note`) **thiếu cột** so với dữ liệu
mua sắm thật đang dùng ở bản gốc (`lab, supplier, task, jira, pr, po, migo, tinhtrang, pic, tfslink`).
Script tạm gộp các field này vào `note` dưới dạng JSON để không mất dữ liệu, nhưng đây chỉ là
giải pháp tạm. Việc cần làm theo đúng quy trình ở mục 3:

```prisma
model PurchaseItem {
  id       String  @id @default(cuid())
  name     String
  quantity Int?
  cost     Float?
  status   String?
  note     String?
  // --- cột mới cần thêm (additive) ---
  lab       String?
  supplier  String?
  task      String?
  jira      String?
  pr        String?
  po        String?
  migo      String?
  tinhtrang String?
  pic       String?
  tfslink   String?
}
```

Sau khi thêm các cột này (migration `add_purchase_fields`, chỉ ADD COLUMN, an toàn additive),
cần chạy 1 script backfill tách JSON đang nằm trong `note` ra các cột mới cho các bản ghi đã
import trước đó, rồi mới cập nhật `PurchaseClient.tsx` để hiển thị đúng các cột này (hiện trang
Purchase Next.js đang dùng đúng field theo schema cũ, nên sau khi thêm cột cần rà lại UI có hiển
thị đủ không).

## 5. Kế hoạch rollback

- Nếu 1 lần deploy code hoặc migration gây lỗi: trước tiên **revert deployment** trên Vercel
  (Deployments tab → chọn bản chạy tốt gần nhất → "Promote to Production", chỉ 1 click, không
  cần revert Git).
- Nếu lỗi do dữ liệu bị ghi sai (không phải lỗi migration schema): dùng Neon PITR — vào
  **Restore** → chọn mốc thời gian trước khi lỗi xảy ra → restore vào branch mới → kiểm tra dữ
  liệu đúng → đổi `DATABASE_URL` trong Vercel sang branch đó (hoặc restore đè lên branch
  `production` tuỳ mức độ nghiêm trọng).
- Nếu lỗi do migration xoá/đổi cột: vì đã theo nguyên tắc additive-first ở mục 3, trường hợp này
  không nên xảy ra ở bước thêm cột — chỉ có thể xảy ra ở bước xoá cột cũ (bước dọn dẹp sau).
  Rollback bằng cách chạy migration ngược thêm lại cột đã xoá (Prisma Migrate giữ lịch sử từng
  bước, có thể viết migration đối ứng) rồi restore dữ liệu cột đó từ snapshot/branch backup gần
  nhất theo mục 2.

## 6. Trạng thái hiện tại (2026-07-18)

- [ ] Đã kiểm tra gói Neon hiện tại + độ dài PITR retention — **chưa làm, cần bạn hoặc Hermes AI kiểm tra trực tiếp trên Neon Console** (sandbox không có mạng).
- [ ] Đã tạo branch/snapshot backup đầu tiên trước khi chạy Bước 5 (di trú dữ liệu) — **chưa làm, nên làm ngay trước khi chạy `scripts/migrate-localstorage.ts --commit` lần đầu**.
- [x] Quy trình additive-first đã viết thành văn bản (tài liệu này) để áp dụng từ nay.
- [x] Đã phát hiện và ghi nhận rõ 1 việc additive cụ thể cần làm (PurchaseItem thiếu cột — mục 4).
