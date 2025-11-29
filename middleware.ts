import { type NextRequest, NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"
import { addCorsHeaders, handleCorsPreflight } from "@/lib/cors"

export async function middleware(request: NextRequest) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return handleCorsPreflight(request) || NextResponse.next();
  }

  // For API routes, handle CORS but skip authentication in middleware
  // (Authentication will be handled within each API route)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    return addCorsHeaders(response);
  }

  const token = request.cookies.get("session")?.value

  // Allow login page without session
  if (request.nextUrl.pathname === "/login") {
    if (token && (await verifySession(token))) {
      const response = NextResponse.redirect(new URL("/", request.url));
      return addCorsHeaders(response);
    }
    const response = NextResponse.next();
    return addCorsHeaders(response);
  }

  // Check session for protected routes
  if (!token || !(await verifySession(token))) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    return addCorsHeaders(response);
  }

  const response = NextResponse.next();
  return addCorsHeaders(response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)", // All routes except static files
  ],
}
