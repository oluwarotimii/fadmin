import { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
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

    // Get user profile (excluding sensitive information)
    const result = await sql`
      SELECT 
        id, 
        email, 
        created_at, 
        updated_at
      FROM users 
      WHERE id = ${user.id}
    `;

    if (!result.length) {
      const response = Response.json({ error: "User not found" }, { status: 404 });
      return addAPICorsHeaders(response);
    }

    const response = Response.json({
      success: true,
      data: result[0]
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching user profile:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verify session
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || request.cookies.get("session")?.value;

    if (!token) {
      const response = Response.json({ error: "Authorization token required" }, { status: 401 });
      return addAPICorsHeaders(response);
    }

    const currentUser = await verifySession(token);
    if (!currentUser) {
      const response = Response.json({ error: "Invalid or expired session" }, { status: 401 });
      return addAPICorsHeaders(response);
    }

    const { email } = await request.json();

    // Update user profile
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email} AND id != ${currentUser.id}
      `;
      
      if (existingUser.length > 0) {
        const response = Response.json({ error: "Email already taken by another user" }, { status: 400 });
        return addAPICorsHeaders(response);
      }

      await sql`
        UPDATE users 
        SET email = ${email}, updated_at = NOW()
        WHERE id = ${currentUser.id}
      `;
    }

    // Get updated user info
    const result = await sql`
      SELECT 
        id, 
        email, 
        created_at, 
        updated_at
      FROM users 
      WHERE id = ${currentUser.id}
    `;

    const response = Response.json({
      success: true,
      data: result[0],
      message: "Profile updated successfully"
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error updating user profile:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}