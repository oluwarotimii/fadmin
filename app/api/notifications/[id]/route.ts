import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    // Get notification by ID
    const result = await sql`
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
      WHERE n.id = ${parseInt(id)}
    `;

    if (!result.length) {
      return Response.json({ error: "Notification not found" }, { status: 404 });
    }

    return Response.json({ success: true, data: result[0] });
  } catch (error: any) {
    console.error("Error fetching notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    const { title, message, image_url, deep_link_type, deep_link_value, recipient_type, recipient_user_id, status } = await request.json();

    // Validate notification ID
    const notificationResult = await sql`
      SELECT id, user_id FROM notifications WHERE id = ${parseInt(id)}
    `;

    if (!notificationResult.length) {
      return Response.json({ error: "Notification not found" }, { status: 404 });
    }

    // Check if user owns this notification
    if (notificationResult[0].user_id !== user.id) {
      return Response.json({ error: "Unauthorized to update this notification" }, { status: 403 });
    }

    // Update notification
    await sql`
      UPDATE notifications 
      SET 
        title = ${title || sql`title`},
        message = ${message || sql`message`},
        image_url = ${image_url || sql`image_url`},
        deep_link_type = ${deep_link_type || sql`deep_link_type`},
        deep_link_value = ${deep_link_value || sql`deep_link_value`},
        recipient_type = ${recipient_type || sql`recipient_type`},
        recipient_user_id = ${recipient_user_id || sql`recipient_user_id`},
        status = ${status || sql`status`},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `;

    return Response.json({ success: true, message: "Notification updated successfully" });
  } catch (error: any) {
    console.error("Error updating notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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

    // Check if notification exists and belongs to user
    const notificationResult = await sql`
      SELECT id, user_id FROM notifications WHERE id = ${parseInt(id)}
    `;

    if (!notificationResult.length) {
      return Response.json({ error: "Notification not found" }, { status: 404 });
    }

    // Check if user owns this notification
    if (notificationResult[0].user_id !== user.id) {
      return Response.json({ error: "Unauthorized to delete this notification" }, { status: 403 });
    }

    // Delete notification
    await sql`
      DELETE FROM notifications WHERE id = ${parseInt(id)}
    `;

    return Response.json({ success: true, message: "Notification deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}