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

    const { expoPushToken, title, body, data } = await request.json();

    if (!expoPushToken || !title || !body) {
      return Response.json({ error: "Expo push token, title, and body are required" }, { status: 400 });
    }

    // Initialize Expo SDK
    const expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN
    });

    // Validate push token
    if (!Expo.isExpoPushToken(expoPushToken)) {
      return Response.json({ error: "Invalid Expo push token" }, { status: 400 });
    }

    // Create the message
    const message = {
      to: expoPushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data || {},
    };

    // Send push notification
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);

    // Create a notification record for the test
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
        ${body},
        null, -- image_url
        null, -- deep_link_type
        null, -- deep_link_value
        'specific', -- recipient_type
        null, -- recipient_user_id
        'sent' -- status - since it's immediately sent
      )
      RETURNING id
    `;

    const notificationId = notificationResult[0].id;

    // Log the notification history
    const ticket = ticketChunk[0];
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

    return Response.json({
      success: true,
      message: "Test notification sent successfully",
      ticket: ticket,
      notificationId: notificationId
    });
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}