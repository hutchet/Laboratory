// Bao ve route: chua dang nhap se bi chuyen ve /login.
// TODO (Buoc 3): sau khi co RBAC on dinh, doc role tu session.user va chan theo module (vi du chi admin vao /settings).
import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = ["/login", "/api/dev-seed"]

export default auth((req) => {
  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))
  if (!req.auth && !isPublic) {
    const loginUrl = new URL("/login", req.nextUrl.origin)
    return NextResponse.redirect(loginUrl)
  }
})

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
