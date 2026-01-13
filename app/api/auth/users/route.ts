import { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    // Handle preflight for GET request
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

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Get users with pagination, but exclude password hashes from the result
    const users = await sql`
      SELECT 
        id, 
        email, 
        created_at, 
        updated_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count for pagination metadata
    const countResult = await sql`SELECT COUNT(*) as count FROM users`;
    const total = parseInt(countResult[0].count);

    const response = Response.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}

// POST method to create a new user (admin only feature)
export async function POST(request: NextRequest) {
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

    const { email, password } = await request.json();

    if (!email || !password) {
      const response = Response.json({ error: "Email and password required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    if (password.length < 6) {
      const response = Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Check if user already exists
    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
      const response = Response.json({ error: "User with this email already exists" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Hash the password
    const { hashPassword } = await import("@/lib/auth");
    const hashedPassword = await hashPassword(password);

    // Create the new user
    const result = await sql`
      INSERT INTO users (email, password_hash) 
      VALUES (${email}, ${hashedPassword}) 
      RETURNING id, email, created_at, updated_at
    `;

    const response = Response.json({
      success: true,
      data: result[0],
      message: "User created successfully"
    });
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error creating user:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}