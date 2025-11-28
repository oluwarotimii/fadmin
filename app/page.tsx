"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import DashboardHeader from "@/components/dashboard-header"
import PushNotificationsModule from "@/components/push-notifications-module"
import CarouselModule from "@/components/carousel-module"
import TrendingBannerModule from "@/components/trending-banner-module"
import ThemeToggle from "@/components/theme-toggle"
import { ArrowRightOnRectangleIcon } from "@heroicons/react/24/solid"

interface User {
  id: number
  email: string
}

export default function Home() {
  const [activeModule, setActiveModule] = useState<"notifications" | "carousel" | "banner">("notifications")
  const [isDark, setIsDark] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (!res.ok) {
          router.push("/login")
          return
        }
        const userData = await res.json()
        setUser(userData)
      } catch (error) {
        router.push("/login")
      } finally {
        setLoading(false)
      }
    }

    verifyAuth()

    // Check system preference for dark mode
    const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches
    setIsDark(isDarkMode)
    updateTheme(isDarkMode)
  }, [router])

  const updateTheme = (dark: boolean) => {
    setIsDark(dark)
    if (dark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <DashboardHeader activeModule={activeModule} onModuleChange={setActiveModule}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          <ThemeToggle isDark={isDark} onToggle={updateTheme} />
          <button
            onClick={handleLogout}
            className="p-2 rounded-md bg-muted hover:bg-border transition-colors"
            aria-label="Logout"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-accent" />
          </button>
        </div>
      </DashboardHeader>

      <main className="flex-1 overflow-y-auto">
        {activeModule === "notifications" && <PushNotificationsModule />}
        {activeModule === "carousel" && <CarouselModule />}
        {activeModule === "banner" && <TrendingBannerModule />}
      </main>
    </DashboardLayout>
  )
}
