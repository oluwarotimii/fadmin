import { verifySession } from "@/lib/auth"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await verifySession(token)

    if (!user) {
      return Response.json({ error: "Session expired" }, { status: 401 })
    }

    return Response.json(user)
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
