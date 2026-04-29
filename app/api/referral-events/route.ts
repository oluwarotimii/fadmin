import { NextRequest } from "next/server";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    const { code, device_id, platform } = await request.json();

    if (!code) {
      return addAPICorsHeaders(Response.json({ error: "Referrer code is required" }, { status: 400 }));
    }

    // Find the referrer by code
    const referrer = await sql`SELECT id FROM referrers WHERE code = ${code}`;

    if (referrer.length === 0) {
      return addAPICorsHeaders(Response.json({ error: "Invalid referrer code" }, { status: 404 }));
    }

    const referrerId = referrer[0].id;

    // Optional: Check for duplicate downloads from same device for this referrer
    if (device_id) {
      const existing = await sql`
        SELECT id FROM referral_events 
        WHERE referrer_id = ${referrerId} AND device_id = ${device_id}
        LIMIT 1
      `;
      if (existing.length > 0) {
        return addAPICorsHeaders(Response.json({ 
          success: true, 
          message: "Download already recorded for this device",
          duplicate: true 
        }));
      }
    }

    // Record the event
    await sql`
      INSERT INTO referral_events (referrer_id, device_id, platform)
      VALUES (${referrerId}, ${device_id || null}, ${platform || null})
    `;

    return addAPICorsHeaders(Response.json({ success: true, message: "Referral recorded successfully" }));
  } catch (error: any) {
    console.error("Error recording referral:", error);
    return addAPICorsHeaders(Response.json({ error: error.message }, { status: 500 }));
  }
}
