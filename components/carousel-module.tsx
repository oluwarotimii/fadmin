"use client"

import { useState, useEffect } from "react"
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
  position: number
}

export default function CarouselModule() {
  const [items, setItems] = useState<CarouselItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch carousel items from API
  const fetchItems = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/carousel")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch carousel items")
      }

      // Transform API response to component format
      const transformedItems = data.data.map((item: any) => ({
        id: String(item.id),
        title: item.title,
        subtitle: item.subtitle || "",
        imageUrl: item.image_url,
        linkType: item.link_type || "none",
        linkValue: item.link_value || "",
        status: item.status as "active" | "inactive",
        position: item.position || 0,
      }))

      setItems(transformedItems)
      setError(null)
    } catch (err: any) {
      console.error("Error fetching carousel items:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const handleAddItem = async (data: any) => {
    try {
      const response = await fetch("/api/carousel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          subtitle: data.subtitle,
          image_url: data.imageUrl,
          link_type: data.linkType,
          link_value: data.linkValue,
          position: items.length > 0 ? Math.max(...items.map(i => i.position)) + 1 : 0,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create carousel item")
      }

      // Refresh the list
      await fetchItems()
    } catch (err: any) {
      console.error("Error adding carousel item:", err)
      alert(`Error: ${err.message}`)
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this carousel item?")) {
      return
    }

    try {
      const response = await fetch(`/api/carousel/${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete carousel item")
      }

      // Refresh the list
      await fetchItems()
    } catch (err: any) {
      console.error("Error deleting carousel item:", err)
      alert(`Error: ${err.message}`)
    }
  }

  const handleToggleStatus = async (id: string) => {
    const item = items.find(i => i.id === id)
    if (!item) return

    const newStatus = item.status === "active" ? "inactive" : "active"

    try {
      const response = await fetch(`/api/carousel/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update carousel item status")
      }

      // Refresh the list
      await fetchItems()
    } catch (err: any) {
      console.error("Error toggling carousel item status:", err)
      alert(`Error: ${err.message}`)
    }
  }

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const index = items.findIndex((item) => item.id === id)
    if ((direction === "up" && index === 0) || (direction === "down" && index === items.length - 1)) {
      return
    }

    const currentItem = items[index]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    const targetItem = items[targetIndex]

    try {
      // Update positions for both items - send complete data to avoid NaN errors
      await Promise.all([
        fetch(`/api/carousel/${currentItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: currentItem.title,
            subtitle: currentItem.subtitle,
            image_url: currentItem.imageUrl,
            link_type: currentItem.linkType,
            link_value: currentItem.linkValue,
            status: currentItem.status,
            position: targetItem.position,
          }),
        }),
        fetch(`/api/carousel/${targetItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: targetItem.title,
            subtitle: targetItem.subtitle,
            image_url: targetItem.imageUrl,
            link_type: targetItem.linkType,
            link_value: targetItem.linkValue,
            status: targetItem.status,
            position: currentItem.position,
          }),
        }),
      ])

      // Refresh the list
      await fetchItems()
    } catch (err: any) {
      console.error("Error reordering carousel items:", err)
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Loading carousel items...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          <p className="font-medium">Error loading carousel items</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

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
