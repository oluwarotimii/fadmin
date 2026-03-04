import { NextRequest } from "next/server";
import { Expo } from 'expo-server-sdk';
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    // Handle preflight for POST request
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

    const { title, message, image_url, deep_link_type, deep_link_value, expo_token } = await request.json();

    if (!title || !message) {
      const response = Response.json({ error: "Title and message are required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    if (!expo_token) {
      const response = Response.json({ error: "Expo push token is required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Initialize Expo SDK
    const expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN
    });

    // Validate push token
    if (!Expo.isExpoPushToken(expo_token)) {
      const response = Response.json({ error: "Invalid Expo push token format" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Create the message
    const pushMessage = {
      to: expo_token,
      sound: 'default',
      title: title,
      body: message,
      data: {
        deepLinkType: deep_link_type,
        deepLinkValue: deep_link_value,
      },
    };

    // Send push notification
    const ticketChunk = await expo.sendPushNotificationsAsync([pushMessage]);
    const ticket = ticketChunk[0];

    // Create a notification record
    const notificationResult = await sql`
      INSERT INTO notifications (
        user_id,
        title,
        message,
        image_url,
        deep_link_type,
        deep_link_value,
        recipient_type,
        recipient_user_id,
        status
      )
      VALUES (
        ${user.id},
        ${title},
        ${message},
        ${image_url || null},
        ${deep_link_type || null},
        ${deep_link_value || null},
        'specific_token',
        null,
        'sent'
      )
      RETURNING id
    `;

    const notificationId = notificationResult[0].id;

    // Log the notification history
    await sql`
      INSERT INTO notification_history (
        notification_id,
        push_token,
        delivery_status,
        error_message
      )
      VALUES (
        ${notificationId},
        ${expo_token},
        ${ticket.status || 'pending'},
        ${(ticket as any).details?.errorMessage || (ticket as any).message || null}
      )
    `;

    const response = Response.json({
      success: true,
      message: "Notification sent successfully",
      ticket: ticket,
      notificationId: notificationId
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}
