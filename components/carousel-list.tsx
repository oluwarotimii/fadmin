"use client"

import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from "@heroicons/react/24/solid"

interface CarouselItem {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  linkType: string
  linkValue: string
  status: "active" | "inactive"
  position: number
}

interface CarouselListProps {
  items: CarouselItem[]
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
  onReorder: (id: string, direction: "up" | "down") => void
}

export default function CarouselList({ items, onDelete, onToggleStatus, onReorder }: CarouselListProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Carousel Items</h2>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No carousel items yet</p>
        ) : (
          items
            .sort((a, b) => a.position - b.position)
            .map((item) => (
              <div
                key={item.id}
                className="p-3 border border-border rounded-md bg-background hover:border-primary transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm truncate">{item.title}</h3>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded whitespace-nowrap ${item.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onReorder(item.id, "up")}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-border transition-colors flex items-center gap-1"
                    title="Move up"
                  >
                    <ChevronUpIcon className="w-4 h-4" />
                    Up
                  </button>
                  <button
                    onClick={() => onReorder(item.id, "down")}
                    className="text-xs px-2 py-1 rounded bg-muted hover:bg-border transition-colors flex items-center gap-1"
                    title="Move down"
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                    Down
                  </button>
                  <button
                    onClick={() => onToggleStatus(item.id)}
                    className={`text-xs px-2 py-1 rounded transition-colors ${item.status === "active"
                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200"
                      }`}
                  >
                    {item.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 transition-colors ml-auto flex items-center gap-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}
