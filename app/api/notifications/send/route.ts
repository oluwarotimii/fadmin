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

    // Get notification details
    const notificationResult = await sql`
      SELECT * FROM notifications WHERE id = ${notificationId}
    `;

    if (!notificationResult.length) {
      return Response.json({ error: "Notification not found" }, { status: 404 });
    }

    const notification = notificationResult[0];

    if (notification.status === 'sent') {
      return Response.json({ error: "Notification already sent" }, { status: 400 });
    }

    // Initialize Expo SDK
    const expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN
    });

    // Get recipient Expo push tokens based on recipient type
    let pushTokens: string[] = [];

    if (notification.recipient_type === 'all') {
      // Fetch all Expo push tokens from users (assuming they have a tokens column)
      // Note: You may need to adjust this query based on how you store Expo push tokens
      const tokenResult = await sql`
        SELECT DISTINCT unnest(string_to_array(push_tokens, ',')) as token
        FROM users 
        WHERE push_tokens IS NOT NULL
        AND push_tokens != ''
      `;
      pushTokens = tokenResult.map((row: any) => row.token);
    } else if (notification.recipient_type === 'specific' && notification.recipient_user_id) {
      // Fetch push tokens for specific user
      const tokenResult = await sql`
        SELECT push_tokens FROM users WHERE id = ${notification.recipient_user_id}
      `;
      if (tokenResult.length > 0 && tokenResult[0].push_tokens) {
        pushTokens = tokenResult[0].push_tokens.split(',');
      }
    } else {
      // Handle custom groups or other recipient types as needed
      // For now, we'll just fetch all tokens
      const tokenResult = await sql`
        SELECT push_tokens FROM users WHERE push_tokens IS NOT NULL AND push_tokens != ''
      `;
      tokenResult.forEach((row: any) => {
        if (row.push_tokens) {
          pushTokens = pushTokens.concat(row.push_tokens.split(','));
        }
      });
    }

    if (!pushTokens || pushTokens.length === 0) {
      return Response.json({ 
        error: "No Expo push tokens found for recipients",
        success: true,
        message: "Notification saved but no recipients found to send to"
      });
    }

    // Validate push tokens
    const validPushTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));
    
    if (validPushTokens.length === 0) {
      return Response.json({ 
        error: "No valid Expo push tokens found",
        success: true,
        message: "Notification saved but no valid recipient tokens found"
      });
    }

    // Create push notification messages
    const messages = [];
    for (const pushToken of validPushTokens) {
      // Construct the message with the notification's data
      messages.push({
        to: pushToken,
        sound: 'default',
        title: notification.title,
        body: notification.message,
        data: {
          deepLinkType: notification.deep_link_type,
          deepLinkValue: notification.deep_link_value,
          notificationId: notification.id
        },
      });
    }

    // Send push notifications
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    // Send the chunks
    for (const [chunkIndex, chunk] of chunks.entries()) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);

        // Save notification history for each token in the chunk
        for (let i = 0; i < chunk.length; i++) {
          const pushToken = chunk[i].to;
          const ticket = ticketChunk[i];

          await sql`
            INSERT INTO notification_history (
              notification_id,
              push_token,
              delivery_status,
              error_message
            ) VALUES (
              ${notificationId},
              ${pushToken},
              ${ticket.status || 'pending'},
              ${(ticket as any).details?.errorMessage || (ticket as any).message || null}
            )
          `;
        }
      } catch (error) {
        console.error("Error sending push notifications chunk:", error);

        // Log failed notifications in history
        for (const message of chunk) {
          await sql`
            INSERT INTO notification_history (
              notification_id,
              push_token,
              delivery_status,
              error_message
            ) VALUES (
              ${notificationId},
              ${message.to},
              'error',
              ${(error as Error).message || 'Failed to send'}
            )
          `;
        }

        return Response.json({ error: "Failed to send some notifications" }, { status: 500 });
      }
    }

    // Update notification status to 'sent'
    await sql`
      UPDATE notifications
      SET status = 'sent', updated_at = NOW()
      WHERE id = ${notificationId}
    `;

    return Response.json({
      success: true,
      message: `Successfully sent ${validPushTokens.length} notifications`,
      tickets: tickets
    });
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}