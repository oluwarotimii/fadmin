"use client"

import type React from "react"

import { useState } from "react"
import FormField from "@/components/form-field"
import FormSelect from "@/components/form-select"

interface CarouselFormProps {
  onSubmit: (data: any) => void
}

export default function CarouselForm({ onSubmit }: CarouselFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    linkType: "none",
    linkValue: "",
    status: "active",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      title: "",
      subtitle: "",
      imageUrl: "",
      linkType: "none",
      linkValue: "",
      status: "active",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground mb-4">Add Carousel Item</h2>

      <FormField
        label="Title"
        type="text"
        placeholder="Carousel title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <FormField
        label="Subtitle"
        type="text"
        placeholder="Carousel subtitle"
        value={formData.subtitle}
        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
      />

      <FormField
        label="Image URL"
        type="text"
        placeholder="https://example.com/image.jpg"
        value={formData.imageUrl}
        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
        required
      />

      <FormSelect
        label="Link Type"
        value={formData.linkType}
        onChange={(e) => setFormData({ ...formData, linkType: e.target.value })}
        options={[
          { label: "None", value: "none" },
          { label: "Product", value: "product" },
          { label: "Category", value: "category" },
          { label: "External", value: "external" },
        ]}
      />

      {formData.linkType !== "none" && (
        <FormField
          label={`${formData.linkType.charAt(0).toUpperCase() + formData.linkType.slice(1)} Value`}
          type="text"
          placeholder="ID, slug, or URL"
          value={formData.linkValue}
          onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
        />
      )}

      <FormSelect
        label="Status"
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
        options={[
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
      />

      <button
        type="submit"
        className={`
          w-full py-2 px-4 rounded-md font-medium text-sm
          bg-primary text-primary-foreground hover:bg-blue-600
          transition-colors duration-200
        `}
      >
        Add Item
      </button>
    </form>
  )
}
