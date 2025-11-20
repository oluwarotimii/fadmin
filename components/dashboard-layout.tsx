import type React from "react"
interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <div className="flex flex-col h-screen bg-background">{children}</div>
}
