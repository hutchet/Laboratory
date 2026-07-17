"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function NavLink({ href, label, dataPage }: { href: string; label: string; dataPage: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + "/")
  return (
    <Link href={href} className={active ? "nav active" : "nav"} data-page={dataPage}>
      {label}
    </Link>
  )
}
