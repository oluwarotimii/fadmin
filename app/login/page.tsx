"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/solid"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Authentication failed")
        return
      }

      if (isSignUp) {
        setError(null)
        alert("Account created! Please sign in.")
        setIsSignUp(false)
        setEmail("")
        setPassword("")
      } else {
        router.push("/")
        router.refresh()
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <div className="bg-card rounded-lg border border-border p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-md bg-primary/10">
              <Image
                src="/logo.svg"
                alt="Expo Admin Logo"
                width={60}
                height={60}
                className="mb-4 rounded-md"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-primary">Expo Admin</h1>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {isSignUp ? "Create an account" : "Sign in to manage push notifications and carousel"}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <EnvelopeIcon className="w-4 h-4 text-primary" />
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2 rounded-md bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <LockClosedIcon className="w-4 h-4 text-primary" />
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-2 rounded-md bg-input border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? (isSignUp ? "Creating account..." : "Signing in...") : isSignUp ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* Toggle Sign Up/Login */}
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground text-center">
            Demo: Use any email/password (6+ chars) to create an account
          </p>
        </div>
      </div>
    </div>
  )
}
