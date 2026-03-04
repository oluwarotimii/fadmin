import { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    // Handle preflight for GET request
    if (request.method === "OPTIONS") {
      return handleAPICorsPreflight();
    }

    // Verify session
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || request.cookies.get("session")?.value;

    if (!token) {
      const response = Response.json({ error: "Authorization token required" }, { status: 401 });
      return addAPICorsHeaders(response);
    }

    const user = await verifySession(token);
    if (!user) {
      const response = Response.json({ error: "Invalid or expired session" }, { status: 401 });
      return addAPICorsHeaders(response);
    }

    // Fetch all active expo push tokens with user info
    const tokens = await sql`
      SELECT
        e.id,
        e.expo_token,
        e.user_id,
        e.is_active,
        e.project_id,
        e.device_info,
        e.last_used_at,
        e.registered_at,
        u.email as user_email
      FROM expo_push_tokens e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE e.is_active = true
      ORDER BY e.last_used_at DESC
    `;

    console.log("Expo tokens fetched:", tokens);

    const response = Response.json({
      success: true,
      data: tokens,
      total: tokens.length
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching expo tokens:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}
