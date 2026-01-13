import { NextRequest } from "next/server";
import { verifySession, hashPassword } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import sql from "@/lib/db";

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

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      const response = Response.json({ error: "Current password and new password are required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    if (newPassword.length < 6) {
      const response = Response.json({ error: "New password must be at least 6 characters" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Get the user's current password hash
    const userResult = await sql`SELECT password_hash FROM users WHERE id = ${user.id}`;
    
    if (!userResult.length) {
      const response = Response.json({ error: "User not found" }, { status: 404 });
      return addAPICorsHeaders(response);
    }

    const { password_hash: currentHash } = userResult[0];
    
    // Verify the current password is correct
    const { verifyPassword } = await import("@/lib/auth");
    const isValid = await verifyPassword(currentPassword, currentHash);
    
    if (!isValid) {
      const response = Response.json({ error: "Current password is incorrect" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Hash the new password
    const newHashedPassword = await hashPassword(newPassword);

    // Update the password in the database
    await sql`
      UPDATE users 
      SET password_hash = ${newHashedPassword}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    // Optionally, invalidate all existing sessions for security
    // await sql`DELETE FROM sessions WHERE user_id = ${user.id}`;

    const response = Response.json({
      success: true,
      message: "Password updated successfully"
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error changing password:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}