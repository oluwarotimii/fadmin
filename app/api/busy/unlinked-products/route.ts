// app/api/busy/unlinked-products/route.ts
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

    // Get products that are not linked to any BUSY item
    // This would typically query your WooCommerce products table
    // For now, I'll create a mock response based on the busy_products table
    // In a real implementation, this would connect to your actual product table
    
    // Get all web products that are not linked
    const unlinkedProducts = await sql`
      SELECT DISTINCT bp.item_name as id, bp.print_name as name, bp.item_name as sku
      FROM busy_products bp
      LEFT JOIN product_link_mapping plm ON bp.item_name = plm.web_product_id
      WHERE plm.web_product_id IS NULL
      LIMIT 50
    `;

    const response = Response.json({
      success: true,
      data: unlinkedProducts
    });

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching unlinked products:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}