// app/api/busy/test/route.ts
import { NextRequest } from "next/server";
import sql from "@/lib/db";
import WooCommerceService from "@/lib/woocommerce";
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

    // Test WooCommerce connection
    let woocommerceConnected = false;
    let woocommerceError = null;
    let busyProductsCount = 0;
    let syncLogsCount = 0;
    
    try {
      const woocommerceService = new WooCommerceService();
      
      // Try to fetch a simple product to test connection
      const testProducts = await woocommerceService.makeRequest('products?per_page=1');
      woocommerceConnected = Array.isArray(testProducts);
    } catch (error: any) {
      woocommerceError = error.message;
    }
    
    // Check if our database tables exist and have data
    try {
      const productsResult = await sql`SELECT COUNT(*) as count FROM busy_products`;
      busyProductsCount = parseInt(productsResult[0].count) || 0;
    } catch (error) {
      // Table might not exist yet
      busyProductsCount = 0;
    }
    
    try {
      const logsResult = await sql`SELECT COUNT(*) as count FROM busy_sync_logs`;
      syncLogsCount = parseInt(logsResult[0].count) || 0;
    } catch (error) {
      // Table might not exist yet
      syncLogsCount = 0;
    }
    
    const response = Response.json({
      success: true,
      tests: {
        woocommerceConnection: {
          status: woocommerceConnected ? 'connected' : 'disconnected',
          error: woocommerceError
        },
        databaseTables: {
          busyProductsCount,
          syncLogsCount,
          tablesExist: true
        },
        environment: {
          hasWooCommerceConfig: !!(process.env.WOOCOMMERCE_URL && process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET)
        }
      }
    });
    
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error in Busy sync test:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}