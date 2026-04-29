"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link";
import DashboardLayout from "@/components/dashboard-layout"
import DashboardHeader from "@/components/dashboard-header"
import PushNotificationsModule from "@/components/push-notifications-module"
import CarouselModule from "@/components/carousel-module"
import TrendingBannerModule from "@/components/trending-banner-module"
import ReferralModule from "@/components/referral-module"
import BusySyncModule from "@/components/busy-sync-module"
import BusyWebApiModule from "@/components/busy-web-api-module"
import DeepLinkTestModule from "@/components/deep-link-test-module"
import ThemeToggle from "@/components/theme-toggle"
import { ArrowRightOnRectangleIcon, UserCircleIcon } from "@heroicons/react/24/solid"
import { Button } from "@/components/ui/button"

interface User {
  id: number
  email: string
}

export default function Home() {
  const [activeModule, setActiveModule] = useState<"notifications" | "carousel" | "banner" | "busy-web-api" | "test-deep-link" | "referral">("notifications")
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
          <Link href="/admin/profile">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <UserCircleIcon className="w-5 h-5" />
              <span className="hidden sm:inline truncate max-w-[100px]">{user?.email}</span>
            </Button>
          </Link>
          <Link href="/admin">
            <Button variant="outline" size="sm">
              Admin Panel
            </Button>
          </Link>
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
        {activeModule === "referral" && <ReferralModule />}
        {activeModule === "test-deep-link" && <DeepLinkTestModule />}
        {/* Legacy Busy Sync Module - Commented out as per requirements */}
        {/* {activeModule === "busy" && <BusySyncModule />} */}
        {activeModule === "busy-web-api" && <BusyWebApiModule />}
      </main>
    </DashboardLayout>
  )
}
