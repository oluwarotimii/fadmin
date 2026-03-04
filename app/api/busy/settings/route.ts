// app/api/busy/settings/route.ts
import { NextRequest } from "next/server";
import sql from "@/lib/db";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

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

    // Get all settings
    const settingsResult = await sql`
      SELECT setting_key, setting_value FROM busy_sync_settings
    `;

    const settings: Record<string, string> = {};
    settingsResult.forEach((setting: any) => {
      settings[setting.setting_key] = setting.setting_value;
    });

    const response = Response.json({
      success: true,
      data: settings
    });

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error fetching BUSY sync settings:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const { settingKey, settingValue } = await request.json();

    if (!settingKey || settingValue === undefined) {
      const response = Response.json({ error: "settingKey and settingValue are required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Update or insert the setting
    await sql`
      INSERT INTO busy_sync_settings (setting_key, setting_value)
      VALUES (${settingKey}, ${settingValue.toString()})
      ON CONFLICT (setting_key)
      DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
    `;

    const response = Response.json({
      success: true,
      message: "Setting updated successfully",
      data: { settingKey, settingValue }
    });

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error updating BUSY sync setting:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}