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
    const { expoPushToken } = body;

    if (!expoPushToken) {
      const response = Response.json({ error: "Expo push token is required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Validate that it's a valid Expo push token format
    if (!expoPushToken.startsWith('ExpoPushToken[') || !expoPushToken.endsWith(']')) {
      const response = Response.json({ error: "Invalid Expo push token format" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Find a system user to store all mobile app tokens (e.g., user with email 'system@mobileapp.com')
    // If the user doesn't exist, create one
    let systemUser = await sql`
      SELECT id, push_tokens FROM users WHERE email = 'system@mobileapp.com'
    `;

    let userId: number;
    let currentTokens: string[] = [];

    if (systemUser.length === 0) {
      // Create a system user to store mobile app tokens
      const newUser = await sql`
        INSERT INTO users (email, password_hash, push_tokens)
        VALUES ('system@mobileapp.com', '', NULL)
        RETURNING id, push_tokens
      `;
      userId = newUser[0].id;
    } else {
      userId = systemUser[0].id;
      if (systemUser[0].push_tokens) {
        currentTokens = systemUser[0].push_tokens.split(',');
      }
    }

    // Add the new token if it's not already in the list
    if (!currentTokens.includes(expoPushToken)) {
      currentTokens.push(expoPushToken);
    }

    // Update the system user's push tokens
    await sql`
      UPDATE users
      SET push_tokens = ${currentTokens.length > 0 ? currentTokens.join(',') : null}
      WHERE id = ${userId}
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
    const { expoPushToken } = body;

    if (!expoPushToken) {
      const response = Response.json({ error: "Expo push token is required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Find the system user that stores mobile app tokens
    const systemUser = await sql`
      SELECT id, push_tokens FROM users WHERE email = 'system@mobileapp.com'
    `;

    if (!systemUser.length) {
      const response = Response.json({ error: "No system user found" }, { status: 404 });
      return addAPICorsHeaders(response);
    }

    let currentTokens = systemUser[0].push_tokens ? systemUser[0].push_tokens.split(',') : [];

    // Remove the token if it exists in the list
    currentTokens = currentTokens.filter((token: string) => token !== expoPushToken);

    // Update the system user's push tokens
    await sql`
      UPDATE users
      SET push_tokens = ${currentTokens.length > 0 ? currentTokens.join(',') : null}
      WHERE id = ${systemUser[0].id}
    `;

    const response = Response.json({
      success: true,
      message: "Expo push token removed successfully"
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error removing Expo push token:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}