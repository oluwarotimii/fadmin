// app/api/busy/products/route.ts
import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import { getCache, setCache } from "@/lib/cache";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    // Handle preflight
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

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status") || null;

    // Create cache key based on parameters
    const cacheKey = `busy_products_${status || 'all'}_${limit}_${offset}`;

    // Try to get from cache first
    const cachedResult = getCache(cacheKey);
    if (cachedResult) {
      const response = Response.json(cachedResult);
      return addAPICorsHeaders(response);
    }

    // Build query based on filters
    let query;
    if (status) {
      query = sql`
        SELECT * FROM busy_products
        WHERE sync_status = ${status}
        ORDER BY last_sync_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT * FROM busy_products
        ORDER BY last_sync_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const products = await query;

    const result = {
      success: true,
      data: products,
      pagination: {
        limit,
        offset,
        total: products.length
      }
    };

    // Cache the result for 2 minutes (120 seconds) since data can change frequently
    setCache(cacheKey, result, 120);

    const response = Response.json(result);

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching Busy products:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}