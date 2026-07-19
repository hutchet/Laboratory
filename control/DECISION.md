# TaskFlow v2 — Quyết định chiến lược

**Ngày chốt:** 2026-07-18  
**Chiến lược:** **A — Big-bang rewrite**  
**Kiến trúc:** Feature-based Modular Monolith (Next.js App Router)

## Quyết định

1. Không tiếp tục vá pixel-perfect trên codebase v1/v14.
2. Xây repo/cây v2 sạch: `src/app` (routing mỏng) + `src/features/*` + `src/shared/*`.
3. Production **không cutover** cho đến khi gate `core` PASS + data migrate PASS.
4. HTML gốc = **spec hành vi / acceptance**, không phải khuôn JSX.
5. Mọi list/form/filter phải đi qua Shared UI Kit — cấm tự dựng bảng/modal một lần dùng trong feature.

## Non-goals (phase 1)

- Pixel-perfect class/id HTML gốc
- Gantt kéo-thả đầy đủ
- Excel/PDF export thật (được placeholder có nhãn)
- i18n đầy đủ
- Microservices / monorepo packages

## Cutover

- Dev/preview: branch `v2` hoặc repo path v2, Vercel Preview URL
- Prod: chỉ sau `npm run gate:module -- core` và checklist P6
- v1 được tag `archive/v1-final` trên GitHub, không xóa ngay

## Ai làm gì

| Vai | Việc |
|---|---|
| Jfrj (Notion AI) | Scaffold, module code, control scripts, zip → trang Notion |
| Hermes AI | Push GitHub, Vercel deploy/preview, `prisma db push` prod |
| User | Ưu tiên module, QA acceptance, chốt cutover |
