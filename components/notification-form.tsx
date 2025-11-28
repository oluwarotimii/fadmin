"use client"

import type React from "react"

import { useState } from "react"
import FormField from "@/components/form-field"
import FormSelect from "@/components/form-select"

interface NotificationFormProps {
  onSubmit: (data: any) => void
}

export default function NotificationForm({ onSubmit }: NotificationFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    imageUrl: "",
    deepLinkType: "none",
    deepLinkValue: "",
    recipientType: "all",
    recipientUserId: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      title: "",
      message: "",
      imageUrl: "",
      deepLinkType: "none",
      deepLinkValue: "",
      recipientType: "all",
      recipientUserId: "",
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground mb-4">Send Notification</h2>

      <FormField
        label="Title"
        type="text"
        placeholder="Notification title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <FormField
        label="Message"
        type="textarea"
        placeholder="Notification message"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        required
      />

      <FormField
        label="Image URL (optional)"
        type="text"
        placeholder="https://example.com/image.jpg"
        value={formData.imageUrl}
        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
      />

      <FormSelect
        label="Recipient"
        value={formData.recipientType}
        onChange={(e) => setFormData({ ...formData, recipientType: e.target.value })}
        options={[
          { label: "All Users", value: "all" },
          { label: "Specific User", value: "specific" },
        ]}
      />

      {formData.recipientType === "specific" && (
        <FormField
          label="User ID"
          type="text"
          placeholder="Enter user ID"
          value={formData.recipientUserId}
          onChange={(e) => setFormData({ ...formData, recipientUserId: e.target.value })}
        />
      )}

      <FormSelect
        label="Deep Link Type"
        value={formData.deepLinkType}
        onChange={(e) => setFormData({ ...formData, deepLinkType: e.target.value })}
        options={[
          { label: "None", value: "none" },
          { label: "Product", value: "product" },
          { label: "Category", value: "category" },
          { label: "External", value: "external" },
        ]}
      />

      {formData.deepLinkType !== "none" && (
        <FormField
          label={`${formData.deepLinkType.charAt(0).toUpperCase() + formData.deepLinkType.slice(1)} Value`}
          type="text"
          placeholder="ID, slug, or URL"
          value={formData.deepLinkValue}
          onChange={(e) => setFormData({ ...formData, deepLinkValue: e.target.value })}
        />
      )}

      <button
        type="submit"
        className={`
          w-full py-2 px-4 rounded-md font-medium text-sm
          bg-accent text-accent-foreground hover:bg-red-700
          transition-colors duration-200
        `}
      >
        Send Notification
      </button>
    </form>
  )
}
