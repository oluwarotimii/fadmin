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
        WHERE ci.status = ${status}
        ORDER BY ci.position ASC, ci.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
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
        ORDER BY ci.position ASC, ci.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const carouselItems = await query;

    return Response.json({ 
      success: true, 
      data: carouselItems,
      pagination: {
        limit,
        offset,
        total: carouselItems.length
      }
    });
  } catch (error: any) {
    console.error("Error fetching carousel items:", error);
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

    const { title, subtitle, image_url, link_type, link_value, position } = await request.json();

    // Validate required fields
    if (!title || !image_url) {
      return Response.json({ error: "Title and image URL are required" }, { status: 400 });
    }

    // Insert carousel item into database
    const result = await sql`
      INSERT INTO carousel_items (
        user_id,
        title,
        subtitle,
        image_url,
        link_type,
        link_value,
        position,
        status
      )
      VALUES (
        ${user.id},
        ${title},
        ${subtitle || null},
        ${image_url},
        ${link_type || 'none'},
        ${link_value || null},
        ${position || 0},
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
    console.error("Error creating carousel item:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}