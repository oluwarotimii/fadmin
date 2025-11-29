import { registerUser } from "@/lib/auth"
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

    if (password.length < 6) {
      const response = Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    const user = await registerUser(email, password)
    const response = Response.json({ success: true, user }, { status: 201 });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    const response = Response.json({ error: error.message }, { status: 400 });
    return addAPICorsHeaders(response);
  }
}
