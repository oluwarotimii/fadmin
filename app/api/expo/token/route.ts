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

    // Determine target user ID (default to system@mobileapp.com if not provided)
    let targetUserId = userId;
    if (!targetUserId) {
      const systemUserResult = await sql`SELECT id FROM users WHERE email = 'system@mobileapp.com'`;
      if (systemUserResult.length > 0) {
        targetUserId = systemUserResult[0].id;
      } else {
        const response = Response.json({ error: "System user not found" }, { status: 404 });
        return addAPICorsHeaders(response);
      }
    }

    // Get existing tokens from users.push_tokens column
    const userResult = await sql`SELECT push_tokens FROM users WHERE id = ${targetUserId}`;
    const existingTokens = userResult[0]?.push_tokens ? userResult[0].push_tokens.split(',').filter((t: string) => t.trim()) : [];

    // Add new token if not already present
    if (!existingTokens.includes(expoPushToken)) {
      existingTokens.push(expoPushToken);
    }

    // Update users table with comma-separated list of tokens
    await sql`
      UPDATE users 
      SET push_tokens = ${existingTokens.join(',')}
      WHERE id = ${targetUserId}
    `;

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
    const { expoPushToken, userId } = body;

    if (!expoPushToken) {
      const response = Response.json({ error: "Expo push token is required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Determine target user ID (default to system@mobileapp.com if not provided)
    let targetUserId = userId;
    if (!targetUserId) {
      const systemUserResult = await sql`SELECT id FROM users WHERE email = 'system@mobileapp.com'`;
      if (systemUserResult.length > 0) {
        targetUserId = systemUserResult[0].id;
      } else {
        const response = Response.json({ error: "System user not found" }, { status: 404 });
        return addAPICorsHeaders(response);
      }
    }

    // Get existing tokens from users.push_tokens column
    const userResult = await sql`SELECT push_tokens FROM users WHERE id = ${targetUserId}`;
    let existingTokens = userResult[0]?.push_tokens ? userResult[0].push_tokens.split(',').filter((t: string) => t.trim()) : [];

    // Remove the token if it exists
    const initialLength = existingTokens.length;
    existingTokens = existingTokens.filter((t: string) => t !== expoPushToken);

    // Update users table with comma-separated list of tokens
    await sql`
      UPDATE users 
      SET push_tokens = ${existingTokens.join(',')}
      WHERE id = ${targetUserId}
    `;

    const removed = existingTokens.length < initialLength;

    const response = Response.json({
      success: true,
      message: removed ? "Expo push token removed successfully" : "Token not found"
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error removing Expo push token:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}