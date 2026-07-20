import type { ReactNode } from "react"

export type FilterBarProps = {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  children?: ReactNode
}

/** Row of filter controls above a DataTable. Search input + arbitrary select/children. */
export function FilterBar({ search, children }: FilterBarProps) {
  return (
    <div data-tf-kit="filter-bar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {search ? (
        <div style={{ position: "relative" }}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="#9aa1ab" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
          <input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder || "Tìm kiếm..."}
            style={{
              padding: "8px 12px 8px 32px",
              borderRadius: 8,
              border: "1px solid #dfe3e8",
              fontSize: 13,
              minWidth: 220,
            }}
          />
        </div>
      ) : null}
      {children}
    </div>
  )
}

export default FilterBar
