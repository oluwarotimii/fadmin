import { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || request.cookies.get("session")?.value;

    if (!token) {
      return addAPICorsHeaders(Response.json({ error: "Authorization token required" }, { status: 401 }));
    }

    const user = await verifySession(token);
    if (!user) {
      return addAPICorsHeaders(Response.json({ error: "Invalid or expired session" }, { status: 401 }));
    }

    const referrers = await sql`
      SELECT 
        r.id, 
        r.name, 
        r.code, 
        r.created_at,
        (SELECT COUNT(*) FROM referral_events WHERE referrer_id = r.id) as total_downloads
      FROM referrers r
      ORDER BY r.name ASC
    `;

    return addAPICorsHeaders(Response.json({ success: true, data: referrers }));
  } catch (error: any) {
    console.error("Error fetching referrers:", error);
    return addAPICorsHeaders(Response.json({ error: error.message }, { status: 500 }));
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || request.cookies.get("session")?.value;

    if (!token) {
      return addAPICorsHeaders(Response.json({ error: "Authorization token required" }, { status: 401 }));
    }

    const user = await verifySession(token);
    if (!user) {
      return addAPICorsHeaders(Response.json({ error: "Invalid or expired session" }, { status: 401 }));
    }

    const { name, code } = await request.json();

    if (!name || !code) {
      return addAPICorsHeaders(Response.json({ error: "Name and code are required" }, { status: 400 }));
    }

    const result = await sql`
      INSERT INTO referrers (name, code)
      VALUES (${name}, ${code})
      RETURNING id, name, code, created_at
    `;

    return addAPICorsHeaders(Response.json({ success: true, data: result[0] }));
  } catch (error: any) {
    console.error("Error creating referrer:", error);
    if (error.message?.includes("unique constraint")) {
      return addAPICorsHeaders(Response.json({ error: "Referrer code already exists" }, { status: 400 }));
    }
    return addAPICorsHeaders(Response.json({ error: error.message }, { status: 500 }));
  }
}
