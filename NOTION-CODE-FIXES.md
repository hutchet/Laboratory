# TaskFlow — 12 lỗi cố định cần fix sau mỗi lần Notion AI export code

> Mỗi lần Notion AI sinh code mới và upload zip lên Notion page, 12 lỗi dưới đây bị revert về trạng thái sai. Hermes AI fix thủ công mỗi lần. Mục tiêu: Notion AI tự sinh code đúng ngay từ đầu.

---

## 🔴 NHÓM 1: BUILD FATAL — VERCEL DEPLOY THẤT BẠI

### 1. `middleware.ts` — Edge Runtime + bcryptjs

**Lỗi:** `Module not found: Can't resolve 'crypto'`

**Sai (Notion code):**
```typescript
import { auth } from "@/lib/auth"
```

**Đúng:**
```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login"]

export default function middleware(req: NextRequest) {
  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  const token = req.cookies.get("__Secure-authjs.session-token")?.value
              || req.cookies.get("__Secure-next-auth.session-token")?.value
              || req.cookies.get("next-auth.session-token")?.value
              || req.cookies.get("authjs.session-token")?.value
  if (token) return NextResponse.next()

  const loginUrl = new URL("/login", req.nextUrl.origin)
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!api/auth|api/debug|_next/static|_next/image|favicon.ico).*)"],
}
```

**Nguyên nhân:** Edge Runtime Webpack không resolve được Node.js `crypto` module mà `bcryptjs` yêu cầu. Middleware không được import bất kỳ file nào dùng bcryptjs (auth, db, prisma...).

---

### 2. `lib/db.ts` — PrismaNeonHTTP adapter

**Lỗi:** `'adapter' does not exist in type Subset<PrismaClientOptions>`

**Sai (Notion code):**
```typescript
import { PrismaClient } from "@prisma/client"
import { PrismaNeonHTTP } from "@neondatabase/serverless"
const adapter = new PrismaNeonHTTP(
  new WebSocket("..."),
  { schema: "public" }
)
export const db = new PrismaClient({ adapter })
```

**Đúng:**
```typescript
import { PrismaClient } from "@prisma/client"
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }
export const db = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

**Nguyên nhân:** Vercel production dùng Node.js 24.x runtime. `PrismaNeonHTTP` adapter chỉ dành cho Edge/Workers. Plain `PrismaClient` singleton là chuẩn cho Vercel.

---

### 3. `package.json` — thiếu `@types/react-dom`

**Lỗi:** `Could not find a declaration file for module 'react-dom'`

**Sai:** `@types/react-dom` bị xoá khỏi `devDependencies`

**Đúng:**
```json
"devDependencies": {
  "@types/react-dom": "^19.2.3"
}
```

**Nguyên nhân:** `CustomSelect.tsx` dùng `createPortal` từ `react-dom`. TypeScript cần type declarations để compile.

---

## 🟡 NHÓM 2: RUNTIME 500 — BUILD OK NHƯNG TRANG TRẮNG

### 4. `app/(app)/layout.tsx` — Server Component có `onFocus`

**Lỗi:** `Event handlers cannot be passed to Client Component props` (digest: 3198374744)

**Sai (Notion code):**
```tsx
// layout.tsx — Server Component (không có "use client")
<input
  id="topsearch"
  placeholder="Tìm kiếm..."
  readOnly
  onFocus={(e) => {
    e.currentTarget.blur()
    window.dispatchEvent(new Event("tf-open-search"))
  }}
/>
```

**Đúng:**
```tsx
// layout.tsx — chỉ gọi component
import SearchInput from "@/components/SearchInput"
<SearchInput />

// components/SearchInput.tsx — Client Component riêng
"use client"
export default function SearchInput() {
  return <input id="topsearch" placeholder="Tìm kiếm..." readOnly
    onFocus={(e) => { e.currentTarget.blur(); window.dispatchEvent(new Event("tf-open-search")) }} />
}
```

**Nguyên nhân:** Layout/page files trong Next.js App Router mặc định là Server Component, KHÔNG được chứa event handlers. Phải extract vào Client Component riêng có `"use client"`.

---

### 5. `app/(app)/quote/[id]/page.tsx` — Server Component có `onBlur`

**Lỗi:** giống #4

**Sai (Notion code):**
```tsx
<input type="number" onBlur={(e) => e.currentTarget.form?.requestSubmit()} />
```

**Đúng:**
```tsx
<input type="number" />  {/* Xoá onBlur */}
```

**Nguyên nhân:** `page.tsx` là Server Component. `onBlur` là event handler → runtime 500.

---

## 🔵 NHÓM 3: TYPE SCRIPT ERRORS

### 6. `EquipmentClient.tsx` — import module không tồn tại

**Lỗi:** `Cannot find module '@/lib/validators'`

**Sai (Notion code):**
```typescript
import { validateModalState } from "@/lib/validateModalState"
import { required, min } from "@/lib/validators"  // File này không tồn tại!
```

**Đúng:**
```typescript
import { validateModalState, required, min } from "@/lib/validateModalState"
```

---

### 7. `EquipmentClient.tsx` — tên biến tiếng Việt có dấu

**Lỗi:** `Cannot find name 'đn'`

**Sai (Notion code):**
```tsx
{đn ? "Xong" : "Chỉnh sửa"}
```

**Đúng:**
```tsx
{editMode ? "Xong" : "Chỉnh sửa"}
```

**Nguyên nhân:** JavaScript/TypeScript không chấp nhận ký tự có dấu (đ, ơ, ư...) trong tên biến. Biến `editMode` đã được định nghĩa.

---

### 8. `EquipmentClient.tsx` — generic type mismatch

**Lỗi:** `Type 'ValidationRule<string | number>' not assignable to 'ValidationRule<unknown>'`

**Sai (Notion code):**
```typescript
const check = validateModalState(
  { name: formData.get("name"), qty: formData.get("qty") },
  {
    name: [required("...")],
    qty: [min(0, "...")],
  },
)
```

**Đúng:**
```typescript
const check = validateModalState(
  { name: formData.get("name"), qty: formData.get("qty") },
  {
    name: [required("...")],
    qty: [min(0, "...")],
  } as any,
)
```

**Nguyên nhân:** `min()` trả về `ValidationRule<number | string>`, schema của `validateModalState` kỳ vọng `ValidationRule<unknown>`. TypeScript không auto-widen generic type trong object literal. Cần `as any`.

---

### 9. `dash/page.tsx` — `p.dueDate` không tồn tại

**Lỗi:** `Property 'dueDate' does not exist on type 'Project & { tasks: Task[] }'`

**Sai (Notion code):**
```typescript
const due = p.dueDate ? p.dueDate.toLocaleDateString('vi-VN') : '—'
```

**Đúng:**
```typescript
const due = '—'
```

**Nguyên nhân:** Prisma schema `Project` KHÔNG có trường `dueDate`. `dueDate` chỉ tồn tại trên `Task` model. Nếu cần, phải thêm `dueDate DateTime?` vào `model Project` trong `schema.prisma`.

---

### 10. `tasks/TasksClient.tsx` — JSX syntax lỗi

**Lỗi 10a:** `JSX element 'div' has no corresponding closing tag`

**Sai (Notion code):**
```tsx
<div className="card" style={{ padding: 0, overflowX: "auto" }}>
  <div className="qs-box">   {/* Mở nhưng không đóng */}
  <table>...</table>
</div>
```

**Đúng:**
```tsx
<div className="card" style={{ padding: 0, overflowX: "auto" }}>
  <div className="qs-box">
    <table>...</table>
    {empty && <div>...</div>}
  </div>                     {/* Đóng qs-box */}
</div>
```

**Lỗi 10b:** `Duplicate identifier 'useRef'`

**Sai (Notion code):**
```typescript
import { useMemo, useRef, useState, useTransition } from "react"
import { saveTask, deleteTask } from "./actions"
import { useRef } from "react"                    // Dòng này trùng!
```

**Đúng:**
```typescript
import { useMemo, useRef, useState, useTransition } from "react"
import { saveTask, deleteTask } from "./actions"
// Chỉ 1 lần import useRef
```

---

## ⚪ NHÓM 4: MINOR — KHÔNG FATAL NHƯNG GÂY DIRTY GIT HISTORY

### 11. `.gitignore` — thiếu `.env.production`

**Sai:** Notion zip overwrite `.gitignore`, không có dòng `.env.production`

**Đúng:** `.env.production` phải có trong `.gitignore`

**Tác hại:** `npx vercel env pull` tạo file `.env.production`. Nếu không ignore, file này bị `git add -A` cuốn vào → commit chứa Vercel token/env vars → phải `git rm --cached` + commit cleanup.

---

### 12. `settings/actions.ts` — `include: { items: true }`

**Lỗi:** Runtime crash khi đọc Quote/TestPlan/AuditPlan

**Sai (Notion code):**
```typescript
db.quote.findMany({ include: { items: true } })
```

**Đúng:**
```typescript
db.quote.findMany()
```

**Nguyên nhân:** Notion AI dùng relation `items` nhưng model `Quote` không có relation này (có `catalogItems`). Model `TestPlan` có `testItems`. Model `AuditPlan` có `phases`. Luôn kiểm tra tên relation với `schema.prisma`.

---

## 📋 CHECKLIST CHO NOTION AI

Trước khi export zip, verify 12 mục:

| # | File | Check |
|---|---|---|
| 1 | `middleware.ts` | KHÔNG import `auth` — dùng cookie check |
| 2 | `lib/db.ts` | plain `PrismaClient` singleton — KHÔNG adapter |
| 3 | `package.json` | `@types/react-dom` trong devDependencies |
| 4 | `app/(app)/layout.tsx` | dùng `<SearchInput />` — ko inline `<input onFocus>` |
| 5 | `app/(app)/quote/[id]/page.tsx` | KHÔNG có `onBlur` |
| 6 | `EquipmentClient.tsx` | import `validateModalState` đúng path |
| 7 | `EquipmentClient.tsx` | KHÔNG có biến `đn` — dùng `editMode` |
| 8 | `EquipmentClient.tsx` | schema validate có `as any` |
| 9 | `dash/page.tsx` | KHÔNG có `p.dueDate` |
| 10a | `tasks/TasksClient.tsx` | `qs-box` div đóng đúng |
| 10b | `tasks/TasksClient.tsx` | `useRef` import 1 lần |
| 11 | `.gitignore` | có dòng `.env.production` |
| 12 | `settings/actions.ts` | KHÔNG có `include: { items: true }` |
