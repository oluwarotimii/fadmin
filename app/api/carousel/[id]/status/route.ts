import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";

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

    const { status } = await request.json();

    if (!status) {
      return Response.json({ error: "Status is required" }, { status: 400 });
    }

    // Validate status value
    if (!['active', 'inactive', 'archived'].includes(status)) {
      return Response.json({ error: "Invalid status value" }, { status: 400 });
    }

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

    // Update carousel item status
    await sql`
      UPDATE carousel_items
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${parseInt(id)}
    `;

    return Response.json({ success: true, message: "Carousel item status updated successfully" });
  } catch (error: any) {
    console.error("Error updating carousel item status:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}