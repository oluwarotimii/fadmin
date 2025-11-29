import { logoutUser } from "@/lib/auth"
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

    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (token) {
      await logoutUser(token)
    }

    cookieStore.delete("session")
    const response = Response.json({ success: true });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    const response = Response.json({ error: error.message }, { status: 400 });
    return addAPICorsHeaders(response);
  }
}
