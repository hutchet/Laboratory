"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"

export default function NavLink({
  href,
  label,
  dataPage,
  icon,
}: {
  href: string
  label: string
  dataPage: string
  icon?: ReactNode
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hrefPath = href.split("?")[0]
  const hrefTab = href.includes("tab=") ? href.split("tab=")[1] : null
  let active = pathname === hrefPath || pathname.startsWith(hrefPath + "/")
  if (active && hrefPath === "/quote") {
    const currentTab = searchParams.get("tab") || "quote-overview"
    active = hrefTab === currentTab
  }
  return (
    <Link href={href} className={active ? "nav active" : "nav"} data-page={dataPage}>
      {icon}
      {icon ? " " : ""}
      {label}
    </Link>
  )
}
