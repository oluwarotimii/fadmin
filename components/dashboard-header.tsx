import type React from "react"
import Image from "next/image"
import NavTabs from "@/components/nav-tabs"

interface DashboardHeaderProps {
  activeModule: "notifications" | "carousel" | "banner"
  onModuleChange: (module: "notifications" | "carousel" | "banner") => void
  children?: React.ReactNode
}

export default function DashboardHeader({ activeModule, onModuleChange, children }: DashboardHeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="p-4 space-y-4">
        {/* Header Top */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
              <Image
                src="/logo.svg"
                alt="Expo Admin Logo"
                width={40}
                height={40}
                className="rounded-md"
                priority
              />
            </div>
            <h1 className="text-xl font-bold text-primary md:text-2xl">Expo Admin</h1>
          </div>
          {children}
        </div>

        {/* Navigation Tabs */}
        <NavTabs activeModule={activeModule} onModuleChange={onModuleChange} />
      </div>
    </header>
  )
}
