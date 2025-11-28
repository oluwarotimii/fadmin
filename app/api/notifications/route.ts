import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status") || null;

    // Build query based on filters
    let query;
    if (status) {
      query = sql`
        SELECT
          n.id,
          n.user_id,
          n.title,
          n.message,
          n.image_url,
          n.deep_link_type,
          n.deep_link_value,
          n.recipient_type,
          n.recipient_user_id,
          n.status,
          n.created_at,
          n.updated_at,
          u.email as created_by
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.status = ${status}
        ORDER BY n.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT
          n.id,
          n.user_id,
          n.title,
          n.message,
          n.image_url,
          n.deep_link_type,
          n.deep_link_value,
          n.recipient_type,
          n.recipient_user_id,
          n.status,
          n.created_at,
          n.updated_at,
          u.email as created_by
        FROM notifications n
        JOIN users u ON n.user_id = u.id
        ORDER BY n.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const notifications = await query;

    return Response.json({ 
      success: true, 
      data: notifications,
      pagination: {
        limit,
        offset,
        total: notifications.length
      }
    });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

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

    const { title, message, image_url, deep_link_type, deep_link_value, recipient_type, recipient_user_id } = await request.json();

    // Validate required fields
    if (!title || !message) {
      return Response.json({ error: "Title and message are required" }, { status: 400 });
    }

    // Insert notification into database
    const result = await sql`
      INSERT INTO notifications (
        user_id, 
        title, 
        message, 
        image_url, 
        deep_link_type, 
        deep_link_value, 
        recipient_type, 
        recipient_user_id,
        status
      ) 
      VALUES (
        ${user.id}, 
        ${title}, 
        ${message}, 
        ${image_url || null}, 
        ${deep_link_type || null}, 
        ${deep_link_value || null}, 
        ${recipient_type || 'all'}, 
        ${recipient_user_id || null},
        'draft'
      ) 
      RETURNING id, created_at, updated_at
    `;

    return Response.json({ 
      success: true, 
      data: { 
        id: result[0].id,
        created_at: result[0].created_at,
        updated_at: result[0].updated_at
      } 
    });
  } catch (error: any) {
    console.error("Error creating notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}