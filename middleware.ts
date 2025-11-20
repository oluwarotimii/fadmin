import { type NextRequest, NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("session")?.value

  // Allow login page without session
  if (request.nextUrl.pathname === "/login") {
    if (token && (await verifySession(token))) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Check session for protected routes
  if (!token || !(await verifySession(token))) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|api).*)"],
}
