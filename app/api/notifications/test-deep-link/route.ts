import { NextRequest } from "next/server";
import { Expo } from 'expo-server-sdk';
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

/**
 * Test endpoint for deep link push notifications
 * Sends the EXACT same payload structure as the production send endpoint
 * Use this to test deep linking in your mobile app
 */

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

    // Parse request body
    const { 
      expoPushToken, 
      title, 
      message, 
      deepLinkType, 
      deepLinkValue 
    } = await request.json();

    // Validate required fields
    if (!expoPushToken) {
      const response = Response.json({ 
        error: "Expo push token is required",
        hint: "Provide the Expo push token from your mobile app"
      }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    if (!title || !message) {
      const response = Response.json({ 
        error: "Title and message are required",
      }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Initialize Expo SDK
    const expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN
    });

    // Validate push token
    if (!Expo.isExpoPushToken(expoPushToken)) {
      const response = Response.json({ 
        error: "Invalid Expo push token format",
        hint: "Token should look like: ExponentPushToken[@your-project-id-...]"
      }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Create the message with THE EXACT SAME STRUCTURE as production
    // This matches the payload in /api/notifications/send/route.ts
    const notificationMessage = {
      to: expoPushToken,
      sound: 'default' as const,
      title: title,
      body: message,
      data: {
        deepLinkType: deepLinkType || "none",
        deepLinkValue: deepLinkValue || "",
        notificationId: `test-${Date.now()}`,
      },
    };

    console.log("Sending test notification with payload:", JSON.stringify(notificationMessage, null, 2));

    // Send push notification
    const ticketChunk = await expo.sendPushNotificationsAsync([notificationMessage]);
    const ticket = ticketChunk[0];

    // Create a notification record for the test (same as production)
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
        null,
        ${deepLinkType || null},
        ${deepLinkValue || null},
        'specific',
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
        ${expoPushToken},
        ${ticket.status || 'pending'},
        ${(ticket as any).details?.errorMessage || (ticket as any).message || null}
      )
    `;

    const response = Response.json({
      success: true,
      message: "Test notification sent successfully",
      data: {
        notificationId: notificationId,
        ticket: ticket,
        payload: notificationMessage,
        // Echo back what was sent for verification
        sent: {
          to: expoPushToken,
          title: title,
          body: message,
          deepLinkType: deepLinkType || "none",
          deepLinkValue: deepLinkValue || ""
        }
      }
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    const response = Response.json({ 
      error: error.message,
      hint: "Make sure your EXPO_ACCESS_TOKEN is set in environment variables"
    }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}
