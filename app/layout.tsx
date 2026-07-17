import type { ReactNode } from "react"

export const metadata = {
  title: "TaskFlow",
  description: "VinFast - Quan ly cong viec",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
