import { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || request.cookies.get("session")?.value;

    if (!token) {
      return addAPICorsHeaders(Response.json({ error: "Authorization token required" }, { status: 401 }));
    }

    const user = await verifySession(token);
    if (!user) {
      return addAPICorsHeaders(Response.json({ error: "Invalid or expired session" }, { status: 401 }));
    }

    // Daily stats (last 7 days)
    const dailyStats = await sql`
      SELECT 
        r.name,
        r.code,
        DATE(re.created_at) as date,
        COUNT(*) as count
      FROM referral_events re
      JOIN referrers r ON re.referrer_id = r.id
      WHERE re.created_at > NOW() - INTERVAL '7 days'
      GROUP BY r.id, r.name, r.code, DATE(re.created_at)
      ORDER BY DATE(re.created_at) DESC, count DESC
    `;

    // Weekly stats (last 4 weeks)
    const weeklyStats = await sql`
      SELECT 
        r.name,
        r.code,
        DATE_TRUNC('week', re.created_at) as week,
        COUNT(*) as count
      FROM referral_events re
      JOIN referrers r ON re.referrer_id = r.id
      WHERE re.created_at > NOW() - INTERVAL '4 weeks'
      GROUP BY r.id, r.name, r.code, DATE_TRUNC('week', re.created_at)
      ORDER BY week DESC, count DESC
    `;

    // Summary per referrer (today, this week, total)
    const summary = await sql`
      SELECT 
        r.id,
        r.name,
        r.code,
        COUNT(*) FILTER (WHERE re.created_at > CURRENT_DATE) as today_count,
        COUNT(*) FILTER (WHERE re.created_at > DATE_TRUNC('week', NOW())) as week_count,
        COUNT(*) as total_count
      FROM referrers r
      LEFT JOIN referral_events re ON r.id = re.referrer_id
      GROUP BY r.id, r.name, r.code
      ORDER BY total_count DESC
    `;

    return addAPICorsHeaders(Response.json({ 
      success: true, 
      data: {
        summary,
        daily: dailyStats,
        weekly: weeklyStats
      } 
    }));
  } catch (error: any) {
    console.error("Error fetching referral stats:", error);
    return addAPICorsHeaders(Response.json({ error: error.message }, { status: 500 }));
  }
}
