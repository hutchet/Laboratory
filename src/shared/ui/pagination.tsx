"use client"

export type PaginationProps = {
  page: number
  pageCount: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

/** Standard pager used by list features with many rows. Ported from the original app's .pager/.pg controls. */
export function Pagination({ page, pageCount, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalItems === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
  return (
    <div
      data-tf-kit="pagination"
      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, flexWrap: "wrap", gap: 10 }}
    >
      <div style={{ fontSize: 12, opacity: 0.65 }}>
        Hiển thị {from}-{to} / {totalItems}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "1px solid #dfe3e8", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid #dfe3e8",
              background: p === page ? "#1d5fd6" : "#fff",
              color: p === page ? "#fff" : "#333",
              cursor: "pointer",
              minWidth: 30,
            }}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5px 10px", borderRadius: 6, border: "1px solid #dfe3e8", background: "#fff", cursor: page === pageCount ? "not-allowed" : "pointer", opacity: page === pageCount ? 0.5 : 1 }}
        >
          ›
        </button>
      </div>
    </div>
  )
}

export default Pagination
