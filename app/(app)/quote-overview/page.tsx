export const runtime = 'edge'
// Trang "quote-overview" -- TODO: chuyen logic tu ban HTML goc: 05-quote-pricing.js (renderQuoteOverview)
// Nho: moi tinh toan quan trong (gia, kiem tra trung lich...) nen chay o server (Route Handler / Server Action),
// khong de lai toan bo o client nhu ban cu.
export default function QuoteOverviewPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>quote-overview</h1>
      <p>Stub trang "quote-overview" -- chua co du lieu thuc, dang cho migrate logic + ket noi Postgres.</p>
    </main>
  )
}
