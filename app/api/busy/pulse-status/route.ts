// app/api/busy/pulse-status/route.ts
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

    // Get pulse watcher status
    const lastEventResult = await sql`
      SELECT created_at FROM sync_event_log 
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    const pendingEventsResult = await sql`
      SELECT COUNT(*) as count FROM sync_event_log 
      WHERE processed_at IS NULL
    `;

    const totalSyncedResult = await sql`
      SELECT COUNT(*) as count FROM busy_product_shadow
    `;

    const lastEvent = lastEventResult.length > 0 ? lastEventResult[0].created_at : null;
    const pendingEvents = parseInt(pendingEventsResult[0].count) || 0;
    const totalSynced = parseInt(totalSyncedResult[0].count) || 0;

    const response = Response.json({
      success: true,
      data: {
        status: 'running', // In a real implementation, this would reflect actual status
        lastEvent,
        pendingEvents,
        totalSynced,
        syncType: 'pulse_watcher' // Differentiates from the old push-based sync
      }
    });

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching pulse status:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}