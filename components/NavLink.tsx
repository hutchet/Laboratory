"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link href={href} className={active ? "nav active" : "nav"} data-page={dataPage}>
      {icon}
      {icon ? " " : ""}
      {label}
    </Link>
  )
}
