# TaskFlow -- Next.js scaffold (Buoc 0-3 cua lo trinh)

Khung du an nay hien thuc hoa 4 buoc dau trong trang lo trinh Notion: thiet ke schema (Buoc 0), dung khung Next.js + Postgres (Buoc 1), khung Authentication (Buoc 2), khung phan quyen RBAC (Buoc 3).

## Vi sao chua chay duoc ngay
Sandbox nay khong co ket noi Internet nen khong the `npm install` cac goi (next, prisma, next-auth...). Toan bo code duoc viet tay, dung cau truc chuan cua tung thu vien -- ban chi can chay tren may/mo trong VS Code co mang la cai dat va chay duoc.

## Cac buoc de chay thu tren may ban (hoac truoc khi len Vercel)

```bash
npm install
cp .env.example .env
# Dien DATABASE_URL (Neon/Supabase) va AUTH_SECRET (npx auth secret) vao .env
npx prisma migrate dev --name init
npm run prisma:seed   # tao 5 vai tro RBAC mac dinh
npm run dev
```

## Cau truc
- `prisma/schema.prisma` -- Buoc 0: toan bo schema Postgres, anh xa tu cac localStorage key cua ban HTML goc (xem chu thich dau file).
- `prisma/seed.ts` -- ma tran quyen RBAC mac dinh cho 5 vai tro: admin, manager, technician, quote_staff, viewer.
- `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts` -- Buoc 2: khung dang nhap bang Auth.js (Credentials provider mau, co the doi sang Supabase Auth/Clerk neu muon nhanh hon).
- `lib/rbac.ts` -- Buoc 3: ham `can(userId, module, action)` de kiem tra quyen truoc khi cho phep hanh dong.
- `app/(app)/*/page.tsx` -- 1 file stub cho MOI trang trong app goc (dash, tasks, equipment, quote-*, auditplan, purchase, settings, members, customers, centers, samples, quality, report). Moi file co ghi ro no thay the phan logic nao trong bo file da tach truoc (`taskflow-modular/js/...`).

## Nhung gi CHUA lam trong ban scaffold nay (can lam tiep)
1. Chuyen logic tinh toan tu cac file JS cu (`05-quote-pricing.js`, `17-equipment-events.js`...) sang Server Components / Route Handlers goi Prisma.
2. Dung lai giao dien tu `css/styles.css` cua ban modular (hien cac trang stub chua co style).
3. Quyet dinh dung hệ bao gia `qt*` hay `ql*` roi xoa code con lai (da ghi chu trong `prisma/schema.prisma`).
4. Viet script import du lieu tu localStorage export cua ban cu vao Postgres (Buoc 5 trong lo trinh Notion).

## Buoc tiep theo -- CAN BAN DANG NHAP
Buoc 4 ("Trien khai Vercel") can ket noi that: GitHub repository, tai khoan Vercel, va nha cung cap Postgres (Neon hoac Supabase). Day la nhung buoc **can ban tu dang nhap/xac thuc truc tiep**, minh khong the lam thay. Khi ban san sang, bao minh va minh se huong dan tung buoc ket noi.
