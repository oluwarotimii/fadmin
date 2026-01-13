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

    const { notificationId } = await request.json();

    if (!notificationId) {
      const response = Response.json({ error: "Notification ID is required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Get notification details
    const notificationResult = await sql`
      SELECT * FROM notifications WHERE id = ${notificationId}
    `;

    if (!notificationResult.length) {
      const response = Response.json({ error: "Notification not found" }, { status: 404 });
      return addAPICorsHeaders(response);
    }

    const notification = notificationResult[0];

    if (notification.status === 'sent') {
      const response = Response.json({ error: "Notification already sent" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Initialize Expo SDK
    const expo = new Expo({
      accessToken: process.env.EXPO_ACCESS_TOKEN
    });

    // Get recipient Expo push tokens based on recipient type
    let pushTokens: string[] = [];

    if (notification.recipient_type === 'all') {
      // Fetch all active Expo push tokens from the dedicated table
      const allTokensResult = await sql`
        SELECT expo_token FROM expo_push_tokens WHERE is_active = true
      `;
      pushTokens = allTokensResult.map(row => row.expo_token);
    } else if (notification.recipient_type === 'specific' && notification.recipient_user_id) {
      // Fetch push tokens for specific user
      const tokenResult = await sql`
        SELECT expo_token FROM expo_push_tokens 
        WHERE user_id = ${notification.recipient_user_id} AND is_active = true
      `;
      pushTokens = tokenResult.map(row => row.expo_token);
    } else if (notification.recipient_type === 'project_specific') {
      // Fetch only tokens that belong to the same project as the current access token
      // Extract project ID from the current access token in environment
      const currentProjectId = process.env.EXPO_PROJECT_ID; // You'll need to add this to env
      if (currentProjectId) {
        const tokenResult = await sql`
          SELECT expo_token FROM expo_push_tokens 
          WHERE project_id = ${currentProjectId} AND is_active = true
        `;
        pushTokens = tokenResult.map(row => row.expo_token);
      } else {
        // Fallback to all active tokens if project ID is not set
        const allTokensResult = await sql`
          SELECT expo_token FROM expo_push_tokens WHERE is_active = true
        `;
        pushTokens = allTokensResult.map(row => row.expo_token);
      }
    } else {
      // Default behavior: fetch all active tokens
      const allTokensResult = await sql`
        SELECT expo_token FROM expo_push_tokens WHERE is_active = true
      `;
      pushTokens = allTokensResult.map(row => row.expo_token);
    }

    if (!pushTokens || pushTokens.length === 0) {
      const response = Response.json({
        error: "No active Expo push tokens found for recipients",
        success: true,
        message: "Notification saved but no active recipients found to send to"
      });
      return addAPICorsHeaders(response);
    }

    // Validate push tokens
    const validPushTokens = pushTokens.filter(token => Expo.isExpoPushToken(token));

    if (validPushTokens.length === 0) {
      const response = Response.json({
        error: "No valid Expo push tokens found",
        success: true,
        message: "Notification saved but no valid recipient tokens found"
      });
      return addAPICorsHeaders(response);
    }

    // Group tokens by project ID to avoid the "same project" error
    const tokensByProject: Record<string, string[]> = {};
    
    for (const token of validPushTokens) {
      // Extract project ID from token
      const match = token.match(/ExponentPushToken\[@([^\-]+)-/);
      const projectId = match ? match[1] : 'unknown';
      
      if (!tokensByProject[projectId]) {
        tokensByProject[projectId] = [];
      }
      tokensByProject[projectId].push(token);
    }

    // Send notifications separately for each project ID
    let totalSent = 0;
    const allTickets = [];

    for (const [projectId, projectTokens] of Object.entries(tokensByProject)) {
      // Create push notification messages for this project
      const messages = [];
      for (const pushToken of projectTokens) {
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

      // Send push notifications for this project
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
          
          totalSent += projectTokens.length;
        } catch (error) {
          console.error(`Error sending push notifications for project ${projectId}:`, error);

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

          const response = Response.json({ error: "Failed to send some notifications for project " + projectId }, { status: 500 });
          return addAPICorsHeaders(response);
        }
      }
      
      allTickets.push(...tickets);
    }

    // Update notification status to 'sent'
    await sql`
      UPDATE notifications
      SET status = 'sent', updated_at = NOW()
      WHERE id = ${notificationId}
    `;

    const response = Response.json({
      success: true,
      message: `Successfully sent ${totalSent} notifications across ${Object.keys(tokensByProject).length} project(s)`,
      tickets: allTickets,
      projectCount: Object.keys(tokensByProject).length
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}