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

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || null;
    const endDate = searchParams.get("endDate") || null;

    // Get notification statistics
    let statsQuery;
    if (startDate && endDate) {
      statsQuery = sql`
        SELECT
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN n.status = 'draft' THEN 1 END) as drafts,
          COUNT(CASE WHEN n.status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN n.status = 'scheduled' THEN 1 END) as scheduled
        FROM notifications n
        WHERE n.user_id = ${user.id}
        AND n.created_at >= ${startDate} AND n.created_at <= ${endDate}
      `;
    } else if (startDate) {
      statsQuery = sql`
        SELECT
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN n.status = 'draft' THEN 1 END) as drafts,
          COUNT(CASE WHEN n.status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN n.status = 'scheduled' THEN 1 END) as scheduled
        FROM notifications n
        WHERE n.user_id = ${user.id}
        AND n.created_at >= ${startDate}
      `;
    } else if (endDate) {
      statsQuery = sql`
        SELECT
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN n.status = 'draft' THEN 1 END) as drafts,
          COUNT(CASE WHEN n.status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN n.status = 'scheduled' THEN 1 END) as scheduled
        FROM notifications n
        WHERE n.user_id = ${user.id}
        AND n.created_at <= ${endDate}
      `;
    } else {
      statsQuery = sql`
        SELECT
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN n.status = 'draft' THEN 1 END) as drafts,
          COUNT(CASE WHEN n.status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN n.status = 'scheduled' THEN 1 END) as scheduled
        FROM notifications n
        WHERE n.user_id = ${user.id}
      `;
    }

    const statsResult = await statsQuery;

    // Get notification history statistics
    let historyStatsQuery;
    if (startDate && endDate) {
      historyStatsQuery = sql`
        SELECT
          COUNT(*) as total_sent,
          COUNT(CASE WHEN nh.delivery_status = 'sent' THEN 1 END) as delivered,
          COUNT(CASE WHEN nh.delivery_status = 'error' THEN 1 END) as failed
        FROM notification_history nh
        JOIN notifications n ON nh.notification_id = n.id
        WHERE n.user_id = ${user.id}
        AND n.created_at >= ${startDate} AND n.created_at <= ${endDate}
      `;
    } else if (startDate) {
      historyStatsQuery = sql`
        SELECT
          COUNT(*) as total_sent,
          COUNT(CASE WHEN nh.delivery_status = 'sent' THEN 1 END) as delivered,
          COUNT(CASE WHEN nh.delivery_status = 'error' THEN 1 END) as failed
        FROM notification_history nh
        JOIN notifications n ON nh.notification_id = n.id
        WHERE n.user_id = ${user.id}
        AND n.created_at >= ${startDate}
      `;
    } else if (endDate) {
      historyStatsQuery = sql`
        SELECT
          COUNT(*) as total_sent,
          COUNT(CASE WHEN nh.delivery_status = 'sent' THEN 1 END) as delivered,
          COUNT(CASE WHEN nh.delivery_status = 'error' THEN 1 END) as failed
        FROM notification_history nh
        JOIN notifications n ON nh.notification_id = n.id
        WHERE n.user_id = ${user.id}
        AND n.created_at <= ${endDate}
      `;
    } else {
      historyStatsQuery = sql`
        SELECT
          COUNT(*) as total_sent,
          COUNT(CASE WHEN nh.delivery_status = 'sent' THEN 1 END) as delivered,
          COUNT(CASE WHEN nh.delivery_status = 'error' THEN 1 END) as failed
        FROM notification_history nh
        JOIN notifications n ON nh.notification_id = n.id
        WHERE n.user_id = ${user.id}
      `;
    }

    const historyStatsResult = await historyStatsQuery;

    // Get recent notifications
    const recentResult = await sql`
      SELECT 
        id, title, message, status, created_at
      FROM notifications
      WHERE user_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    return Response.json({
      success: true,
      data: {
        notificationStats: statsResult[0],
        deliveryStats: historyStatsResult[0],
        recentNotifications: recentResult
      }
    });
  } catch (error: any) {
    console.error("Error fetching notification statistics:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}