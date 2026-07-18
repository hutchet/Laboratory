import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login"]

export default function middleware(req: NextRequest) {
  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  const token = req.cookies.get("__Secure-authjs.session-token")?.value
              || req.cookies.get("__Secure-next-auth.session-token")?.value
              || req.cookies.get("next-auth.session-token")?.value
              || req.cookies.get("authjs.session-token")?.value
  if (token) return NextResponse.next()

  const loginUrl = new URL("/login", req.nextUrl.origin)
  loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!api/auth|api/debug|_next/static|_next/image|favicon.ico).*)"],
}
