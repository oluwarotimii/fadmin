"use client"

import { BellIcon, SparklesIcon, PhotoIcon, CubeIcon, BugAntIcon } from "@heroicons/react/24/solid"

interface NavTabsProps {
  activeModule: "notifications" | "carousel" | "banner" | "busy-web-api" | "test-deep-link"
  onModuleChange: (module: "notifications" | "carousel" | "banner" | "busy-web-api" | "test-deep-link") => void
}

export default function NavTabs({ activeModule, onModuleChange }: NavTabsProps) {
  const tabs = [
    { id: "notifications", label: "Push Notifications", icon: BellIcon },
    { id: "carousel", label: "Carousel", icon: SparklesIcon },
    { id: "banner", label: "Trending Banner", icon: PhotoIcon },
    { id: "test-deep-link", label: "Test Deep Link", icon: BugAntIcon },
    // { id: "busy", label: "Busy Sync (Legacy)", icon: CubeIcon }, // Commented out as per requirements
    { id: "busy-web-api", label: "BUSY Web API", icon: CubeIcon },
  ] as const

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onModuleChange(tab.id)}
            className={`
              px-4 py-2 rounded-md whitespace-nowrap text-sm font-medium
              transition-colors duration-200 flex items-center gap-2
              ${activeModule === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground hover:bg-border"
              }
            `}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
