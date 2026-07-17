export const runtime = 'edge'
// Trang "quote-list-legacy" -- TODO: chuyen logic tu ban HTML goc: 22-quote-list-legacy.js (RA SOAT truoc: co the la code cu, xem README goc)
// Nho: moi tinh toan quan trong (gia, kiem tra trung lich...) nen chay o server (Route Handler / Server Action),
// khong de lai toan bo o client nhu ban cu.
export default function QuoteListLegacyPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>quote-list-legacy</h1>
      <p>Stub trang "quote-list-legacy" -- chua co du lieu thuc, dang cho migrate logic + ket noi Postgres.</p>
    </main>
  )
}
