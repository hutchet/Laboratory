# 📝 Yêu cầu sửa lỗi cho Notion AI (copy-paste vào task của Notion)

## Các lỗi lặp lại cần fix TRONG CODE GỐC TRƯỚC KHI ĐÓNG ZIP

Mỗi lần tao đóng zip, KHÔNG được mắc các lỗi sau. Đây là checklist kiểm tra bắt buộc trước khi tạo file zip:

---

### 1. `package.json` — build command, peer dep, postinstall

**KHÔNG được:** đặt `"build": "npm run control:check && next build"` (control:check không tồn tại trên Vercel).  
**KHÔNG được:** thêm `"postinstall": "prisma generate"` (Vercel đã chạy `npx prisma generate && next build` trong build command rồi).  
**KHÔNG được:** set `"@types/react-dom": "^19.2.3"` (project dùng React 18, phải là `^18.3.0`).  

✅ Set đúng:
```json
"build": "next build",
"@types/react-dom": "^18.3.0",
// Không có postinstall
```

---

### 2. `src/app/(app)/layout.tsx` — RBAC rank type

**KHÔNG được:** viết `let rbacValue = { rank: "viewer" as const, ... }`  
→ TypeScript lỗi vì `"viewer" as const` không compatible với kiểu `PermRank` import từ rbac-client.  

✅ Phải viết:
```tsx
let rbacValue: { rank: import("@/shared/lib/rbac-client").PermRank; roleNames: string[]; modulePerms: string[] } = 
  { rank: "viewer" as import("@/shared/lib/rbac-client").PermRank, roleNames: [] as string[], modulePerms: [] as string[] }
```

---

### 3. `src/features/equipment/components/BookingsView.tsx` — thiếu state `formError` và `readyEquipment`

**KHÔNG được:** dùng `setFormError` và `readyEquipment` trong JSX mà không khai báo.  

✅ Thêm 2 khai báo:
```tsx
const [formError, setFormError] = useState<string | null>(null)

const readyEquipment = useMemo(
  () => visibleEquipment.filter((e) => e.status !== "maintenance"),
  [visibleEquipment]
)
```

---

### 4. `src/shared/lib/audit.ts` — thiếu `"report"` trong union type

**KHÔNG được:** dùng `logAudit("report", ...)` trong report module mà `AuditEntity` union thiếu `"report"`.  

✅ Thêm vào union:
```tsx
export type AuditEntity = "task" | "project" | ... | "report"
```

---

### 5. `src/shared/lib/i18n.ts` — duplicate key "Chất lượng & Hệ thống"

**KHÔNG được:** thêm key `"Chất lượng & Hệ thống": "Quality & System"` (số ít) trong khi đã có `"Chất lượng & Hệ thống": "Quality & Systems"` (số nhiều). Object literal không thể có 2 key cùng tên.  

✅ Chỉ giữ 1 dòng duy nhất:
```tsx
"Chất lượng & Hệ thống": "Quality & Systems",
```

---

### 6. `src/shared/lib/i18n.ts` — translation từ `i18n-applier.tsx` import sai

**KHÔNG được:** trong `src/shared/ui/i18n-applier.tsx` import type `Language` từ `@/features/settings/types`  
→ Rule kiến trúc: `shared` KHÔNG được import `features`.  

✅ Định nghĩa type `Language` local ngay trong `i18n-applier.tsx`:
```tsx
export type Language = "vi" | "en"
```

---

### 7. `tsconfig.json` — path alias

**KHÔNG được:** set `"@/*": ["./*"]` khi project dùng `src/` directory.  

✅ Phải là:
```json
"paths": { "@/*": ["./src/*"] }
```

---

### 8. `middleware.ts` — import auth (kéo bcryptjs vào Edge Runtime)

**KHÔNG được:** import `{ auth }` từ `@/shared/lib/auth` trong middleware.ts  
→ Kéo bcryptjs + PrismaAdapter vào Edge Runtime → build lỗi `Module not found: Can't resolve 'crypto'`.  

✅ Middleware chỉ check cookie trực tiếp:
```tsx
const token = req.cookies.get("__Secure-authjs.session-token")?.value
            || req.cookies.get("__Secure-next-auth.session-token")?.value
            || req.cookies.get("next-auth.session-token")?.value
            || req.cookies.get("authjs.session-token")?.value
if (token) return NextResponse.next()
```

---

### 9. `runtime = 'edge'` trên auth route hoặc login page

**KHÔNG được:** đặt `export const runtime = 'edge'` trong:
- `src/app/api/auth/[...nextauth]/route.ts` (dùng bcryptjs → crash silently)
- `src/app/(auth)/login/page.tsx` (dùng next-auth/react → crash)

→ Build THÀNH CÔNG nhưng login silent fail với `CredentialsSignin`. Mất 1 tiếng để debug.  

✅ Xoá `runtime` khỏi cả 2 file.

---

### 10. `BookingsView.tsx` — syntax lỗi `categories` useMemo

**KHÔNG được:** viết `useMemo(() =>` (arrow function không body) khi có nhiều statements:

❌ Sai:
```tsx
const categories = useMemo(() =>
  const set = new Set<string>()
  ...
  return Array.from(set).sort()
, [equipment])
```

✅ Đúng:
```tsx
const categories = useMemo(() => {
  const set = new Set<string>()
  ...
  return Array.from(set).sort()
}, [equipment])
```

---

## Checklist trước khi tạo ZIP

- [ ] `package.json`: build command, @types/react-dom, KHÔNG postinstall
- [ ] `layout.tsx`: RBAC rank cast đúng kiểu PermRank
- [ ] `BookingsView.tsx`: có formError + readyEquipment
- [ ] `audit.ts`: có `"report"` trong AuditEntity
- [ ] `i18n.ts`: không duplicate key
- [ ] `i18n-applier.tsx`: Language type local, không import từ features
- [ ] `tsconfig.json`: `@/* → ./src/*`
- [ ] `middleware.ts`: không import auth
- [ ] Auth route + login page: không có `runtime = 'edge'`
- [ ] Không có `let rbacValue = { rank: \"viewer\" as const, ... }` pattern
- [ ] TSC check 0 errors
