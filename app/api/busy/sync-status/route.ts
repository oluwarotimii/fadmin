// app/api/busy/sync-status/route.ts
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

    // Get synchronization status data
    // Count total BUSY items in shadow database
    const totalBusyItemsResult = await sql`
      SELECT COUNT(*) as count FROM busy_product_shadow
    `;
    const totalBusyItems = parseInt(totalBusyItemsResult[0].count) || 0;

    // Count linked products
    const linkedProductsResult = await sql`
      SELECT COUNT(*) as count FROM product_link_mapping
      WHERE is_sync_enabled = true
    `;
    const linkedProducts = parseInt(linkedProductsResult[0].count) || 0;

    // Count unlinked products
    const unlinkedProductsResult = await sql`
      SELECT COUNT(*) as count FROM busy_product_shadow bps
      LEFT JOIN product_link_mapping plm ON bps.busy_item_code = plm.busy_item_code
      WHERE plm.busy_item_code IS NULL
    `;
    const unlinkedProducts = parseInt(unlinkedProductsResult[0].count) || 0;

    // Count products with sync issues (price or stock mismatch)
    // This would require comparing with WooCommerce products if available
    // For now, we'll return a placeholder value
    const syncIssuesResult = await sql`
      SELECT COUNT(*) as count FROM sync_event_log
      WHERE processed_at IS NULL
    `;
    const syncIssues = parseInt(syncIssuesResult[0].count) || 0;

    // Get recent sync activity
    const recentActivityResult = await sql`
      SELECT 
        event_type,
        busy_item_code,
        created_at,
        old_values,
        new_values
      FROM sync_event_log
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const response = Response.json({
      success: true,
      data: {
        totalBusyItems,
        linkedProducts,
        unlinkedProducts,
        syncIssues,
        syncHealth: totalBusyItems > 0 ? Math.round(((totalBusyItems - syncIssues) / totalBusyItems) * 100) : 100,
        recentActivity: recentActivityResult
      }
    });

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching sync status:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}