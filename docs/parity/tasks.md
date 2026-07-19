# Parity checklist — tasks (page-tasks)

HTML reference: `page-tasks` in `taskflow_original.html`.

| # | Hành vi bản gốc | Trạng thái v2 | Ghi chú |
|---|---|---|---|
| 1 | Danh sách công việc dạng bảng | ✅ | `DataTable` |
| 2 | Lọc theo trạng thái (chip: tất cả/chưa làm/đang làm/hoàn thành) | ✅ | client-side filter |
| 3 | Tìm kiếm theo tên | ✅ | `FilterBar` search |
| 4 | Thêm/sửa công việc (modal form) | ✅ | `FormModal`, server action `saveTask` |
| 5 | Xoá công việc (xác nhận) | ✅ | `ConfirmDialog`, server action `deleteTask` |
| 6 | Avatar chữ cái đầu người phụ trách | ✅ | `AvatarInitials` |
| 7 | Nhãn ưu tiên/trạng thái màu | ✅ | `StatusBadge` |
| 8 | RBAC theo module `tasks` (create/edit/delete) | ✅ | `can()` trong `actions.ts` |
| 9 | Kéo dãn cột bảng (`useColResize`) | ❌ chưa port | phase sau, không bắt buọc cho parity chức năng |
| 10 | Xuất CSV | ❌ chưa port | phase sau |
| 11 | Đồng hồ “còn lại bao nhiêu ngày” (remainingLabel) | ❌ chưa port | cặp nhứt nếu cần trong DataTable column |

Tình trạng module: **in_progress** — chức năng core (CRUD + filter + RBAC) đạt parity, còn 3 tính năng phụ (#9–11) chờ phase sau.
