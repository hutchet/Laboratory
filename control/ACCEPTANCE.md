# Acceptance — quy tắc kiểm soát chất lượng module

## Định nghĩa “module DONE”

Một module trong `control/modules.json` chỉ được đổi `status` → `done` khi **tất cả** điều kiện sau đúng:

1. **Structure**
   - Có `featureDir` (nếu là product module) với tối thiểu:
     - `queries.ts` (server load)
     - `actions.ts` (mutations + zod + rbac)
     - `components/*View.tsx` (UI)
     - `types.ts` hoặc schema zod
   - `app/(app)/<route>/page.tsx` chỉ compose (fetch + render), **không** chứa business logic dài.

2. **Kit compliance**
   - List dùng `@/shared/ui/data-table` (hoặc wrapper feature mỏng).
   - Form thêm/sửa dùng `@/shared/ui/form-modal`.
   - Filter chip/dropdown dùng `@/shared/ui/filter-bar`.
   - Page chrome dùng `@/shared/ui/page-shell`.
   - Không copy markup bảng/modal từ HTML gốc vào feature.

3. **Functional parity (không phải DOM parity)**
   - Đối chiếu `docs/parity/<module>.md` checklist hành vi.
   - CRUD (nếu HTML có) hoạt động trên DB thật.
   - Empty/loading/error states có UI.

4. **Security**
   - Mọi action gọi `can(...)` / rbac tương đương.
   - Input validate bằng Zod.

5. **Control automation**
   - `npm run control:check` PASS
   - `npm run gate:module -- <id>` PASS
   - Không import chéo feature→feature

6. **Human sign-off**
   - User hoặc Hermes xác nhận trên preview URL (ghi vào `control/SIGN OFF.md`)

## Cấm báo DONE khi

- Chỉ có stub “Coming soon”
- UI hardcode mảng fake thay DB (trừ demo kit)
- “Giống HTML” nhưng thiếu action/rbac
- Sửa xong nhưng chưa chạy `control:check`

## Mức ưu tiên acceptance

| Mức | Ý nghĩa |
|---|---|
| P0 | Chặn gate core / cutover |
| P1 | Cần cho full product |
| P2 | Nice-to-have / phase sau (Gantt drag, export file…) |
