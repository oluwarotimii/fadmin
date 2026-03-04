// app/api/busy/link-product/route.ts
import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function POST(request: NextRequest) {
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

    const { webProductId, busyItemCode, isSyncEnabled = true } = await request.json();

    if (!webProductId || !busyItemCode) {
      const response = Response.json({ error: "webProductId and busyItemCode are required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Create or update the product link mapping
    const result = await sql`
      INSERT INTO product_link_mapping (
        web_product_id,
        busy_item_code,
        is_sync_enabled
      )
      VALUES (
        ${webProductId},
        ${busyItemCode},
        ${isSyncEnabled}
      )
      ON CONFLICT (web_product_id)
      DO UPDATE SET
        busy_item_code = EXCLUDED.busy_item_code,
        is_sync_enabled = EXCLUDED.is_sync_enabled,
        updated_at = NOW()
      RETURNING id
    `;

    const response = Response.json({
      success: true,
      message: "Product link updated successfully",
      linkId: result[0].id
    });

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error linking product:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}

export async function DELETE(request: NextRequest) {
  try {
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

    const { webProductId } = await request.json();

    if (!webProductId) {
      const response = Response.json({ error: "webProductId is required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Delete the product link mapping
    await sql`
      DELETE FROM product_link_mapping
      WHERE web_product_id = ${webProductId}
    `;

    const response = Response.json({
      success: true,
      message: "Product link removed successfully"
    });

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error unlinking product:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}