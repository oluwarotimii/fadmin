import type React from "react"
import NavTabs from "@/components/nav-tabs"

interface DashboardHeaderProps {
  activeModule: "notifications" | "carousel"
  onModuleChange: (module: "notifications" | "carousel") => void
  children?: React.ReactNode
}

export default function DashboardHeader({ activeModule, onModuleChange, children }: DashboardHeaderProps) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="p-4 space-y-4">
        {/* Header Top */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary md:text-2xl">Expo Admin</h1>
          {children}
        </div>

        {/* Navigation Tabs */}
        <NavTabs activeModule={activeModule} onModuleChange={onModuleChange} />
      </div>
    </header>
  )
}
