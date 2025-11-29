import { loginUser } from "@/lib/auth"
import { cookies } from "next/headers"
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors"

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function POST(request: Request) {
  try {
    // Handle preflight for POST request
    if (request.method === "OPTIONS") {
      return handleAPICorsPreflight();
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      const response = Response.json({ error: "Email and password required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    const { token, ...user } = await loginUser(email, password)

    const cookieStore = await cookies()
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    const response = Response.json({ success: true, user });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    const response = Response.json({ error: error.message }, { status: 400 });
    return addAPICorsHeaders(response);
  }
}
