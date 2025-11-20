import { logoutUser } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("session")?.value

    if (token) {
      await logoutUser(token)
    }

    cookieStore.delete("session")
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 400 })
  }
}
