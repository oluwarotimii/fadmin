import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";

// Get trending banner (authenticated - for admin dashboard)
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

        // Get the current active banner
        const result = await sql`
      SELECT 
        tb.id,
        tb.user_id,
        tb.image_url,
        tb.status,
        tb.created_at,
        tb.updated_at,
        u.email as created_by
      FROM trending_banner tb
      JOIN users u ON tb.user_id = u.id
      ORDER BY tb.created_at DESC
      LIMIT 1
    `;

        return Response.json({
            success: true,
            data: result.length > 0 ? result[0] : null
        });
    } catch (error: any) {
        console.error("Error fetching trending banner:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// Create or update trending banner
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

        const { image_url } = await request.json();

        // Validate required fields
        if (!image_url) {
            return Response.json({ error: "Image URL is required" }, { status: 400 });
        }

        // Set all existing banners to inactive
        await sql`
      UPDATE trending_banner
      SET status = 'inactive', updated_at = NOW()
      WHERE status = 'active'
    `;

        // Insert new banner as active
        const result = await sql`
      INSERT INTO trending_banner (
        user_id,
        image_url,
        status
      )
      VALUES (
        ${user.id},
        ${image_url},
        'active'
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
        console.error("Error creating trending banner:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}

// Delete trending banner
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

        // Set current active banner to inactive instead of deleting
        await sql`
      UPDATE trending_banner
      SET status = 'inactive', updated_at = NOW()
      WHERE status = 'active'
    `;

        return Response.json({
            success: true,
            message: "Trending banner removed successfully"
        });
    } catch (error: any) {
        console.error("Error removing trending banner:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
