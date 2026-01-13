import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

export async function GET(request: NextRequest) {
  // Return a simple response for GET requests to verify the endpoint exists
  const response = Response.json({
    message: "Expo token endpoint - use POST to register tokens or DELETE to remove tokens",
    methods: ["POST", "DELETE", "OPTIONS"]
  });
  return addAPICorsHeaders(response);
}

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expoPushToken, userId, deviceInfo } = body;

    if (!expoPushToken) {
      const response = Response.json({ error: "Expo push token is required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Validate that it's a valid Expo push token format
    if (!expoPushToken.startsWith('ExponentPushToken[') || !expoPushToken.endsWith(']')) {
      const response = Response.json({ error: "Invalid Expo push token format" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Check if the token already exists in the database
    const existingToken = await sql`
      SELECT id FROM expo_push_tokens WHERE expo_token = ${expoPushToken}
    `;

    if (existingToken.length > 0) {
      // If token exists, just update the active status and timestamps
      await sql`
        UPDATE expo_push_tokens 
        SET is_active = true, last_used_at = NOW()
        WHERE expo_token = ${expoPushToken}
      `;
    } else {
      // Extract project ID from the token (first part before the first hyphen after the bracket)
      let projectId = null;
      const match = expoPushToken.match(/ExponentPushToken\[@([^\-]+)-/);
      if (match && match[1]) {
        projectId = match[1]; // This extracts the project identifier
      }

      // Insert the new token into the expo_push_tokens table
      await sql`
        INSERT INTO expo_push_tokens (user_id, expo_token, is_active, project_id, device_info)
        VALUES (${userId || null}, ${expoPushToken}, true, ${projectId || null}, ${deviceInfo ? JSON.stringify(deviceInfo) : null})
      `;
    }

    const response = Response.json({
      success: true,
      message: "Expo push token registered successfully"
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error registering Expo push token:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { expoPushToken } = body;

    if (!expoPushToken) {
      const response = Response.json({ error: "Expo push token is required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Soft delete the token by setting is_active to false (you could use hard delete if preferred)
    await sql`
      UPDATE expo_push_tokens
      SET is_active = false
      WHERE expo_token = ${expoPushToken}
    `;

    const response = Response.json({
      success: true,
      message: "Expo push token deactivated successfully"
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error deactivating Expo push token:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}