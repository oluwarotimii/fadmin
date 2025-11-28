import { NextRequest } from "next/server";
import sql from "@/lib/db";

// Public endpoint for Expo app to fetch active trending banner
// No authentication required
export async function GET(request: NextRequest) {
    try {
        // Fetch only the active trending banner
        const result = await sql`
      SELECT 
        id,
        image_url,
        created_at,
        updated_at
      FROM trending_banner
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `;

        return Response.json({
            success: true,
            data: result.length > 0 ? {
                id: result[0].id,
                imageUrl: result[0].image_url,
                createdAt: result[0].created_at,
                updatedAt: result[0].updated_at
            } : null
        });
    } catch (error: any) {
        console.error("Error fetching public trending banner:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
