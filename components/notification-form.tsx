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
    pageSlug: "awoof",
    awoofActionType: "open_feed",
    awoofReplaceCart: true,
    awoofItemsJson: `[\n  { "productId": 123, "quantity": 2 },\n  { "productId": 456, "quantity": 1 }\n]`,
    awoofProductId: "123",
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
    try {
      const payload =
        formData.deepLinkType === "page"
          ? {
              ...formData,
              deepLinkValue: JSON.stringify({
                page: formData.pageSlug,
                awoofAction:
                  formData.pageSlug !== "awoof"
                    ? undefined
                    : formData.awoofActionType === "open_feed"
                      ? { actionType: "open_feed" }
                      : formData.awoofActionType === "open_cart"
                        ? {
                            actionType: "open_cart",
                            replaceCart: Boolean(formData.awoofReplaceCart),
                            items: JSON.parse(formData.awoofItemsJson || "[]"),
                          }
                        : formData.awoofActionType === "checkout"
                          ? {
                              actionType: "checkout",
                              replaceCart: Boolean(formData.awoofReplaceCart),
                              items: JSON.parse(formData.awoofItemsJson || "[]"),
                            }
                          : { actionType: "checkout_product", productId: Number(formData.awoofProductId) },
              }),
            }
          : formData

      onSubmit(payload)
    } catch (error: any) {
      alert(error?.message || "Invalid JSON in Items JSON")
      return
    }
    setFormData({
      title: "",
      message: "",
      imageUrl: "",
      deepLinkType: "none",
      deepLinkValue: "",
      pageSlug: "awoof",
      awoofActionType: "open_feed",
      awoofReplaceCart: true,
      awoofItemsJson: `[\n  { "productId": 123, "quantity": 2 },\n  { "productId": 456, "quantity": 1 }\n]`,
      awoofProductId: "123",
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
          { label: "Page", value: "page" },
          { label: "External", value: "external" },
        ]}
      />

      {formData.deepLinkType === "page" && (
        <>
          <FormSelect
            label="Page"
            value={formData.pageSlug}
            onChange={(e) => setFormData({ ...formData, pageSlug: e.target.value })}
            options={[
              { label: "Awoof", value: "awoof" },
            ]}
          />

          {formData.pageSlug === "awoof" && (
            <>
              <FormSelect
                label="Awoof Action"
                value={formData.awoofActionType}
                onChange={(e) => setFormData({ ...formData, awoofActionType: e.target.value })}
                options={[
                  { label: "Open feed", value: "open_feed" },
                  { label: "Prefill + open cart", value: "open_cart" },
                  { label: "Prefill + checkout cart", value: "checkout" },
                  { label: "Checkout one product", value: "checkout_product" },
                ]}
              />

              {(formData.awoofActionType === "open_cart" || formData.awoofActionType === "checkout") && (
                <>
                  <FormSelect
                    label="Replace Cart"
                    value={String(formData.awoofReplaceCart)}
                    onChange={(e) => setFormData({ ...formData, awoofReplaceCart: e.target.value === "true" })}
                    options={[
                      { label: "Yes", value: "true" },
                      { label: "No", value: "false" },
                    ]}
                  />

                  <FormField
                    label="Items JSON"
                    type="textarea"
                    placeholder='[{"productId":123,"quantity":2}]'
                    value={formData.awoofItemsJson}
                    onChange={(e) => setFormData({ ...formData, awoofItemsJson: e.target.value })}
                  />
                </>
              )}

              {formData.awoofActionType === "checkout_product" && (
                <FormField
                  label="Product ID (WooCommerce)"
                  type="text"
                  placeholder="123"
                  value={formData.awoofProductId}
                  onChange={(e) => setFormData({ ...formData, awoofProductId: e.target.value })}
                />
              )}
            </>
          )}
        </>
      )}

      {formData.deepLinkType !== "none" && formData.deepLinkType !== "page" && (
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
