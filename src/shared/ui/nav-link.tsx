"use client"
import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

export function NavLink({ href, label, dataPage, icon }: { href: string; label: string; dataPage: string; icon?: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hrefPath = href.split("?")[0]
  const hrefTab = href.includes("tab=") ? href.split("tab=")[1] : null
  let active = pathname === hrefPath || pathname.startsWith(hrefPath + "/")
  if (active) {
    // Port cua fix loi sidebar (bao cao 1:40 PM): truoc day chi cac muc CO
    // tab rieng (hrefTab) moi bi thu hep theo tab hien tai, nen muc "Thiet
    // bi" (href=/equipment, khong co tab) van sang mau khi dang o tab khac
    // (vd ?tab=analytics cua "Dat lich") vi dieu kien active&&hrefTab bo qua
    // no. Gio ca 2 muc cung group /equipment (hoac /quote) deu so sanh voi
    // tab hien tai, dung tab mac dinh khi URL khong co ?tab=.
    const defaultTab = hrefPath === "/quote" ? "quote-overview" : hrefPath === "/equipment" ? "equipment" : null
    if (defaultTab) {
      const currentTab = searchParams.get("tab") || defaultTab
      const effectiveHrefTab = hrefTab || defaultTab
      active = effectiveHrefTab === currentTab
    }
  }
  return (
    <Link href={href} className={active ? "nav active" : "nav"} data-page={dataPage}>
      {icon}
      {icon ? " " : ""}
      {label}
    </Link>
  )
}

export default NavLink
