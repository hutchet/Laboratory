import type { ReactNode } from "react"
import { SearchInput } from "./search-input"

export type FilterBarProps = {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string; width?: number }
  /** Droplist / CustomSelect — hiển trước search */
  filterSlot?: ReactNode
  /** Bất kỳ controls nào thêm sau search */
  children?: ReactNode
}

/** Toolbar filter chuẩn: [filterSlot?] [SearchInput?] [children] */
export function FilterBar({ search, filterSlot, children }: FilterBarProps) {
  return (
    <div data-tf-kit="filter-bar" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      {filterSlot}
      {search ? (
        <SearchInput
          value={search.value}
          onChange={search.onChange}
          placeholder={search.placeholder}
          width={search.width ?? 220}
        />
      ) : null}
      {children}
    </div>
  )
}

export default FilterBar
