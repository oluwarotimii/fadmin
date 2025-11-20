"use client"

import { BellIcon, SparklesIcon } from "@heroicons/react/24/solid"

interface NavTabsProps {
  activeModule: "notifications" | "carousel"
  onModuleChange: (module: "notifications" | "carousel") => void
}

export default function NavTabs({ activeModule, onModuleChange }: NavTabsProps) {
  const tabs = [
    { id: "notifications", label: "Push Notifications", icon: BellIcon },
    { id: "carousel", label: "Carousel", icon: SparklesIcon },
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
              ${
                activeModule === tab.id
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
