// app/api/busy/shadow-items/route.ts
import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    // Handle preflight
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

    // Get BUSY items from the shadow database
    const busyItems = await sql`
      SELECT 
        busy_item_code,
        busy_item_name,
        busy_print_name,
        busy_rate,
        busy_qty_on_hand,
        busy_unit_name,
        busy_material_center,
        busy_last_modified
      FROM busy_product_shadow
      WHERE is_active = true
      ORDER BY busy_print_name
      LIMIT 100
    `;

    const response = Response.json({
      success: true,
      data: busyItems
    });

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching shadow items:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}