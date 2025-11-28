import { NextRequest } from "next/server";
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

    const { expoPushToken } = await request.json();

    if (!expoPushToken) {
      return Response.json({ error: "Expo push token is required" }, { status: 400 });
    }

    // Validate that it's a valid Expo push token format
    if (!expoPushToken.startsWith('ExpoPushToken[') || !expoPushToken.endsWith(']')) {
      return Response.json({ error: "Invalid Expo push token format" }, { status: 400 });
    }

    // Get current push tokens for the user
    const userResult = await sql`
      SELECT push_tokens FROM users WHERE id = ${user.id}
    `;

    if (!userResult.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    let currentTokens = userResult[0].push_tokens ? userResult[0].push_tokens.split(',') : [];

    // Add the new token if it's not already in the list
    if (!currentTokens.includes(expoPushToken)) {
      currentTokens.push(expoPushToken);
    }

    // Update the user's push tokens
    await sql`
      UPDATE users
      SET push_tokens = ${currentTokens.length > 0 ? currentTokens.join(',') : null}
      WHERE id = ${user.id}
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

    const { expoPushToken } = await request.json();

    if (!expoPushToken) {
      return Response.json({ error: "Expo push token is required" }, { status: 400 });
    }

    // Get current push tokens for the user
    const userResult = await sql`
      SELECT push_tokens FROM users WHERE id = ${user.id}
    `;

    if (!userResult.length) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    let currentTokens = userResult[0].push_tokens ? userResult[0].push_tokens.split(',') : [];
    
    // Remove the token if it exists in the list
    currentTokens = currentTokens.filter((token: string) => token !== expoPushToken);

    // Update the user's push tokens
    await sql`
      UPDATE users 
      SET push_tokens = ${currentTokens.length > 0 ? currentTokens.join(',') : null}
      WHERE id = ${user.id}
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