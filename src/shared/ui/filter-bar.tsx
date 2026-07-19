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
        <input
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder || "Tìm kiếm..."}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #dfe3e8",
            fontSize: 13,
            minWidth: 220,
          }}
        />
      ) : null}
      {children}
    </div>
  )
}

export default FilterBar
