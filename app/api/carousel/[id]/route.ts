import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

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

    // Get carousel item by ID
    const result = await sql`
      SELECT 
        ci.id,
        ci.user_id,
        ci.title,
        ci.subtitle,
        ci.image_url,
        ci.link_type,
        ci.link_value,
        ci.status,
        ci.position,
        ci.created_at,
        ci.updated_at,
        u.email as created_by
      FROM carousel_items ci
      JOIN users u ON ci.user_id = u.id
      WHERE ci.id = ${parseInt(id)}
    `;

    if (!result.length) {
      return Response.json({ error: "Carousel item not found" }, { status: 404 });
    }

    return Response.json({ success: true, data: result[0] });
  } catch (error: any) {
    console.error("Error fetching carousel item:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

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

    const { title, subtitle, image_url, link_type, link_value, position, status } = await request.json();

    // Validate carousel item ID
    const itemResult = await sql`
      SELECT id, user_id FROM carousel_items WHERE id = ${parseInt(id)}
    `;

    if (!itemResult.length) {
      return Response.json({ error: "Carousel item not found" }, { status: 404 });
    }

    // Check if user owns this carousel item
    if (itemResult[0].user_id !== user.id) {
      return Response.json({ error: "Unauthorized to update this carousel item" }, { status: 403 });
    }

    // Update carousel item
    await sql`
      UPDATE carousel_items
      SET
        title = ${title || sql`title`},
        subtitle = ${subtitle || sql`subtitle`},
        image_url = ${image_url || sql`image_url`},
        link_type = ${link_type || sql`link_type`},
        link_value = ${link_value || sql`link_value`},
        position = ${position !== undefined ? position : sql`position`},
        status = ${status || sql`status`},
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `;

    return Response.json({ success: true, message: "Carousel item updated successfully" });
  } catch (error: any) {
    console.error("Error updating carousel item:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

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

    // Check if carousel item exists and belongs to user
    const itemResult = await sql`
      SELECT id, user_id FROM carousel_items WHERE id = ${parseInt(id)}
    `;

    if (!itemResult.length) {
      return Response.json({ error: "Carousel item not found" }, { status: 404 });
    }

    // Check if user owns this carousel item
    if (itemResult[0].user_id !== user.id) {
      return Response.json({ error: "Unauthorized to delete this carousel item" }, { status: 403 });
    }

    // Delete carousel item
    await sql`
      DELETE FROM carousel_items WHERE id = ${parseInt(id)}
    `;

    return Response.json({ success: true, message: "Carousel item deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting carousel item:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}