// app/api/sync/busy/manual/route.ts
import { NextRequest } from "next/server";
import sql from "@/lib/db";
import WooCommerceService from "@/lib/woocommerce";
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

    // For manual sync, we'll simulate pulling data from Busy system
    // In a real implementation, this would either:
    // 1. Trigger the Busy system to send data
    // 2. Pull data from Busy system directly (if API is available)
    // For now, we'll return a success response

    // Start sync log entry
    const syncLogResult = await sql`
      INSERT INTO busy_sync_logs (sync_type, status, products_processed)
      VALUES ('manual_sync', 'started', 0)
      RETURNING id
    `;
    
    const syncLogId = syncLogResult[0].id;
    
    // Update log to show completion
    await sql`
      UPDATE busy_sync_logs 
      SET status = 'completed', 
          products_processed = 0,
          products_updated = 0,
          products_created = 0,
          products_failed = 0,
          completed_at = NOW()
      WHERE id = ${syncLogId}
    `;

    const response = Response.json({
      success: true,
      message: "Manual sync initiated"
    });
    
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error in manual Busy sync:", error);
    
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}