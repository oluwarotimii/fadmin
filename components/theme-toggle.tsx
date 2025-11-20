"use client"

import { SunIcon, MoonIcon } from "@heroicons/react/24/solid"

interface ThemeToggleProps {
  isDark: boolean
  onToggle: (isDark: boolean) => void
}

export default function ThemeToggle({ isDark, onToggle }: ThemeToggleProps) {
  return (
    <button
      onClick={() => onToggle(!isDark)}
      className={`
        p-2 rounded-md transition-colors
        ${isDark ? "bg-muted text-accent" : "bg-muted text-primary"}
      `}
      aria-label="Toggle theme"
    >
      {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  )
}
