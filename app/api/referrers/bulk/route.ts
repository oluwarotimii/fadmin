import { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";
import sql from "@/lib/db";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

/**
 * Generates a memorable code: NAME + 4 random digits
 * e.g., JOHN4821
 */
function generateMemorableCode(name: string): string {
  const cleanName = name.replace(/[^a-zA-Z]/g, "").toUpperCase().substring(0, 6);
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${cleanName}${randomDigits}`;
}

async function isCodeUnique(code: string): Promise<boolean> {
  const result = await sql`SELECT id FROM referrers WHERE code = ${code}`;
  return result.length === 0;
}

export async function POST(request: NextRequest) {
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

    const { names } = await request.json();

    if (!names || !Array.isArray(names) || names.length === 0) {
      return addAPICorsHeaders(Response.json({ error: "A list of names is required" }, { status: 400 }));
    }

    const results = [];
    const errors = [];

    for (const name of names) {
      if (!name || typeof name !== "string") continue;

      try {
        let code = generateMemorableCode(name);
        let attempts = 0;
        
        // Ensure uniqueness
        while (!(await isCodeUnique(code)) && attempts < 10) {
          code = generateMemorableCode(name);
          attempts++;
        }

        const insertResult = await sql`
          INSERT INTO referrers (name, code)
          VALUES (${name.trim()}, ${code})
          RETURNING id, name, code
        `;
        results.push(insertResult[0]);
      } catch (err: any) {
        errors.push({ name, error: err.message });
      }
    }

    return addAPICorsHeaders(Response.json({ 
      success: true, 
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully imported ${results.length} referrers`
    }));
  } catch (error: any) {
    console.error("Bulk import error:", error);
    return addAPICorsHeaders(Response.json({ error: error.message }, { status: 500 }));
  }
}
