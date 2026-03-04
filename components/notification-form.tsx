"use client"

import type React from "react"

import { useState, useEffect } from "react"
import FormField from "@/components/form-field"
import FormSelect from "@/components/form-select"

interface ExpoToken {
  id: number
  expo_token: string
  user_id: number | null
  user_email?: string | null
  email?: string | null
  device_info: any
  last_used_at: string
  registered_at?: string
}

interface NotificationFormProps {
  onSubmit: (data: any) => void
}

export default function NotificationForm({ onSubmit }: NotificationFormProps) {
  const [expoTokens, setExpoTokens] = useState<ExpoToken[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    imageUrl: "",
    deepLinkType: "none",
    deepLinkValue: "",
    recipientType: "all",
    recipientUserId: "",
    expoToken: "",
  })

  // Fetch active expo push tokens for the dropdown
  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoadingTokens(true)
        const response = await fetch("/api/expo/tokens")
        const data = await response.json()
        if (data.success) {
          setExpoTokens(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch expo tokens:", error)
      } finally {
        setLoadingTokens(false)
      }
    }
    fetchTokens()
  }, [])

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
      expoToken: "",
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
          { label: "Specific User (from dropdown)", value: "specific" },
          { label: "Specific Token (paste token)", value: "specific_token" },
        ]}
      />

      {formData.recipientType === "specific" && (
        <FormSelect
          label="Select User"
          value={formData.recipientUserId}
          onChange={(e) => setFormData({ ...formData, recipientUserId: e.target.value })}
          options={
            loadingTokens
              ? [{ label: "Loading users...", value: "", disabled: true }]
              : expoTokens.length === 0
                ? [{ label: "No active devices found", value: "", disabled: true }]
                : expoTokens.map((token) => ({
                    label: `${token.user_email || token.email || `User ${token.user_id || token.id}`} - ${token.expo_token?.substring(0, 50)}... (${token.device_info ? JSON.parse(token.device_info)?.brand || 'Device' : 'Device'})`,
                    value: String(token.user_id || token.id),
                  }))
          }
        />
      )}

      {formData.recipientType === "specific_token" && (
        <FormField
          label="Expo Push Token"
          type="textarea"
          placeholder="ExponentPushToken[@...]"
          value={formData.expoToken}
          onChange={(e) => setFormData({ ...formData, expoToken: e.target.value })}
          required
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
