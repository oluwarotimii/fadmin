"use client"

import { useState } from "react"
import FormField from "@/components/form-field"
import FormSelect from "@/components/form-select"

export default function DeepLinkTestModule() {
  const [formData, setFormData] = useState({
    expoPushToken: "",
    title: "",
    message: "",
    imageUrl: "",
    deepLinkType: "none",
    deepLinkValue: "",
  })

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; data?: any } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/notifications/test-deep-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expoPushToken: formData.expoPushToken,
          title: formData.title,
          body: formData.message,
          deepLinkType: formData.deepLinkType,
          deepLinkValue: formData.deepLinkValue,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: data.message, data: data.data })
      } else {
        setResult({ success: false, message: data.error || "Failed to send test notification" })
      }
    } catch (error: any) {
      setResult({ success: false, message: error.message || "An error occurred" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Test Notification</h1>
        <p className="text-muted-foreground mt-2">
          Send a test push notification to a specific device. This uses the same payload structure as production.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-4 md:p-6 space-y-4">
        <FormField
          label="Expo Push Token"
          type="text"
          placeholder="ExponentPushToken[@...]"
          value={formData.expoPushToken}
          onChange={(e) => setFormData({ ...formData, expoPushToken: e.target.value })}
          required
        />

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
            placeholder={
              formData.deepLinkType === "product" ? "Product ID or slug" :
              formData.deepLinkType === "category" ? "Category ID or slug" :
              "https://example.com"
            }
            value={formData.deepLinkValue}
            onChange={(e) => setFormData({ ...formData, deepLinkValue: e.target.value })}
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className={`
            w-full py-2 px-4 rounded-md font-medium text-sm
            bg-accent text-accent-foreground hover:bg-accent/90
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
          >
          {loading ? "Sending..." : "Send Notification"}
        </button>
      </form>

      {result && (
        <div className={`mt-6 p-4 rounded-lg border ${
          result.success
            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            : "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
        }`}>
          <h3 className={`font-semibold mb-2 ${
            result.success ? "text-green-900 dark:text-green-300" : "text-red-900 dark:text-red-300"
          }`}>
            {result.message}
          </h3>

          {result.data && (
            <details className="mt-2">
              <summary className="text-sm font-medium text-foreground cursor-pointer">
                View Payload Sent
              </summary>
              <pre className="mt-2 p-3 bg-gray-900 dark:bg-gray-950 text-green-400 text-xs rounded overflow-auto max-h-96">
                {JSON.stringify(result.data.payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
