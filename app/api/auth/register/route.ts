import { registerUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ error: "Email and password required" }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const user = await registerUser(email, password)
    return Response.json({ success: true, user }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 400 })
  }
}
