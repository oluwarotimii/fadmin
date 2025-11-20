"use client"

import { useState } from "react"
import CarouselForm from "@/components/carousel-form"
import CarouselList from "@/components/carousel-list"

interface CarouselItem {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  linkType: string
  linkValue: string
  status: "active" | "inactive"
  order: number
}

export default function CarouselModule() {
  const [items, setItems] = useState<CarouselItem[]>([
    {
      id: "1",
      title: "Summer Collection",
      subtitle: "Shop the latest trends",
      imageUrl: "/summer-collection-display.png",
      linkType: "category",
      linkValue: "summer",
      status: "active",
      order: 1,
    },
  ])

  const handleAddItem = (data: any) => {
    const newItem: CarouselItem = {
      id: String(items.length + 1),
      ...data,
      order: Math.max(...items.map((i) => i.order), 0) + 1,
    }
    setItems([...items, newItem])
  }

  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id))
  }

  const handleToggleStatus = (id: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, status: item.status === "active" ? "inactive" : "active" } : item,
      ),
    )
  }

  const handleReorder = (id: string, direction: "up" | "down") => {
    const index = items.findIndex((item) => item.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) {
      return
    }

    const newItems = [...items]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
    setItems(newItems)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Form Section */}
        <div className="md:col-span-1">
          <CarouselForm onSubmit={handleAddItem} />
        </div>

        {/* List Section */}
        <div className="md:col-span-1">
          <CarouselList
            items={items}
            onDelete={handleDeleteItem}
            onToggleStatus={handleToggleStatus}
            onReorder={handleReorder}
          />
        </div>
      </div>
    </div>
  )
}
