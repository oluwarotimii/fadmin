import { NextRequest } from "next/server";
import { Expo } from 'expo-server-sdk';
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function POST(request: NextRequest) {
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

    const { notificationId } = await request.json();

    if (!notificationId) {
      return Response.json({ error: "Notification ID is required" }, { status: 400 });
    }

    // Get notification tickets from history
    const historyResult = await sql`
      SELECT id, push_token, delivery_status, error_message 
      FROM notification_history 
      WHERE notification_id = ${notificationId}
    `;

    if (!historyResult.length) {
      return Response.json({ error: "No history found for this notification" }, { status: 404 });
    }

    // Initialize Expo SDK to check ticket status
    const expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN
    });

    // Get the actual ticket IDs to check status (this would require storing ticket IDs)
    // For now, we'll just return the stored history
    const statusUpdates = [];

    for (const record of historyResult) {
      statusUpdates.push({
        pushToken: record.push_token,
        status: record.delivery_status,
        errorMessage: record.error_message
      });
    }

    return Response.json({ 
      success: true,
      data: {
        notificationId,
        total: historyResult.length,
        statusUpdates
      }
    });
  } catch (error: any) {
    console.error("Error checking notification status:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}