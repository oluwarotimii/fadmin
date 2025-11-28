import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify session
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || request.cookies.get("session")?.value;
    
    if (!token) {
      return Response.json({ error: "Authorization token required" }, { status: 401 });
    }
    
    const user = await verifySession(token);
    if (!user) {
      return Response.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status") || null;
    const notificationId = searchParams.get("notificationId") || null;

    // Build query based on filters
    let query;
    if (status && notificationId) {
      query = sql`
        SELECT
          nh.id,
          nh.notification_id,
          nh.push_token,
          nh.delivery_status,
          nh.error_message,
          nh.sent_at,
          n.title as notification_title
        FROM notification_history nh
        LEFT JOIN notifications n ON nh.notification_id = n.id
        WHERE nh.delivery_status = ${status} AND nh.notification_id = ${notificationId}
        ORDER BY nh.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (status) {
      query = sql`
        SELECT
          nh.id,
          nh.notification_id,
          nh.push_token,
          nh.delivery_status,
          nh.error_message,
          nh.sent_at,
          n.title as notification_title
        FROM notification_history nh
        LEFT JOIN notifications n ON nh.notification_id = n.id
        WHERE nh.delivery_status = ${status}
        ORDER BY nh.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else if (notificationId) {
      query = sql`
        SELECT
          nh.id,
          nh.notification_id,
          nh.push_token,
          nh.delivery_status,
          nh.error_message,
          nh.sent_at,
          n.title as notification_title
        FROM notification_history nh
        LEFT JOIN notifications n ON nh.notification_id = n.id
        WHERE nh.notification_id = ${notificationId}
        ORDER BY nh.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT
          nh.id,
          nh.notification_id,
          nh.push_token,
          nh.delivery_status,
          nh.error_message,
          nh.sent_at,
          n.title as notification_title
        FROM notification_history nh
        LEFT JOIN notifications n ON nh.notification_id = n.id
        ORDER BY nh.sent_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const history = await query;

    return Response.json({ 
      success: true, 
      data: history,
      pagination: {
        limit,
        offset,
        total: history.length
      }
    });
  } catch (error: any) {
    console.error("Error fetching notification history:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}