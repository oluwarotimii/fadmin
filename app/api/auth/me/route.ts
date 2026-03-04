import { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth"
import { cookies } from "next/headers"
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors"

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    // Handle preflight for GET request
    if (request.method === "OPTIONS") {
      return handleAPICorsPreflight();
    }

    const cookieStore = await cookies()
    const token = request.headers.get("authorization")?.split(" ")[1] || cookieStore.get("session")?.value

    if (!token) {
      const response = Response.json({ error: "Unauthorized" }, { status: 401 });
      return addAPICorsHeaders(response);
    }

    const user = await verifySession(token)

    if (!user) {
      const response = Response.json({ error: "Session expired" }, { status: 401 });
      return addAPICorsHeaders(response);
    }

    const response = Response.json(user);
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("/api/auth/me error:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}
