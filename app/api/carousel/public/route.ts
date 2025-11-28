import { NextRequest } from "next/server";
import sql from "@/lib/db";

// Public endpoint for Expo app to fetch active carousel items
// No authentication required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    // Fetch only active carousel items, ordered by position
    const carouselItems = await sql`
      SELECT 
        id,
        title,
        subtitle,
        image_url,
        link_type,
        link_value,
        position,
        created_at,
        updated_at
      FROM carousel_items
      WHERE status = 'active'
      ORDER BY position ASC, created_at DESC
      LIMIT ${limit}
    `;

    return Response.json({ 
      success: true, 
      data: carouselItems.map(item => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        imageUrl: item.image_url,
        linkType: item.link_type,
        linkValue: item.link_value,
        position: item.position,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }))
    });
  } catch (error: any) {
    console.error("Error fetching public carousel items:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
