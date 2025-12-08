import { NextRequest } from "next/server";
import sql from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { expoPushToken } = await request.json();

    if (!expoPushToken) {
      return Response.json({ error: "Expo push token is required" }, { status: 400 });
    }

    // Validate that it's a valid Expo push token format
    if (!expoPushToken.startsWith('ExpoPushToken[') || !expoPushToken.endsWith(']')) {
      return Response.json({ error: "Invalid Expo push token format" }, { status: 400 });
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

    return Response.json({
      success: true,
      message: "Expo push token registered successfully"
    });
  } catch (error: any) {
    console.error("Error registering Expo push token:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { expoPushToken } = await request.json();

    if (!expoPushToken) {
      return Response.json({ error: "Expo push token is required" }, { status: 400 });
    }

    // Find the system user that stores mobile app tokens
    const systemUser = await sql`
      SELECT id, push_tokens FROM users WHERE email = 'system@mobileapp.com'
    `;

    if (!systemUser.length) {
      return Response.json({ error: "No system user found" }, { status: 404 });
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

    return Response.json({
      success: true,
      message: "Expo push token removed successfully"
    });
  } catch (error: any) {
    console.error("Error removing Expo push token:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}