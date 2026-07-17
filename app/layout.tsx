import type { ReactNode } from "react"
import "./globals.css"


export const metadata = {
  title: "TaskFlow",
  description: "VinFast - Quan ly cong viec",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body className="material-3">{children}</body>
    </html>
  )
}
