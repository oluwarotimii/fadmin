"use client"

import { useState, useEffect } from "react"
import NotificationForm from "@/components/notification-form"
import NotificationHistory from "@/components/notification-history"

interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  status: "sent" | "delivered" | "failed"
  imageUrl?: string
  deepLinkType?: string
  deepLinkValue?: string
}

export default function PushNotificationsModule() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/notifications")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch notifications")
      }

      // Transform API response to component format
      const transformedNotifications = data.data.map((item: any) => ({
        id: String(item.id),
        title: item.title,
        message: item.message,
        timestamp: new Date(item.created_at),
        status: (item.status === 'sent' || item.status === 'delivered' || item.status === 'failed') ? item.status : 'sent',
        imageUrl: item.image_url,
        deepLinkType: item.deep_link_type,
        deepLinkValue: item.deep_link_value,
      }))

      setNotifications(transformedNotifications)
      setError(null)
    } catch (err: any) {
      console.error("Error fetching notifications:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleSendNotification = async (data: any) => {
    try {
      // First, create the notification
      const createResponse = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: data.title,
          message: data.message,
          image_url: data.imageUrl || null,
          deep_link_type: data.deepLinkType !== "none" ? data.deepLinkType : null,
          deep_link_value: data.deepLinkValue || null,
          recipient_type: data.recipientType || "all",
          recipient_user_id: data.recipientUserId || null,
        }),
      })

      const createResult = await createResponse.json()

      if (!createResponse.ok) {
        throw new Error(createResult.error || "Failed to create notification")
      }

      const notificationId = createResult.data.id

      // Then, send the notification
      const sendResponse = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notificationId,
        }),
      })

      const sendResult = await sendResponse.json()

      if (!sendResponse.ok) {
        throw new Error(sendResult.error || "Failed to send notification")
      }

      alert(`Notification sent successfully: ${sendResult.message}`)

      // Refresh the list
      await fetchNotifications()
    } catch (err: any) {
      console.error("Error sending notification:", err)
      alert(`Error: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-muted-foreground">Loading notifications...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          <p className="font-medium">Error loading notifications</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Form Section */}
        <div className="md:col-span-1">
          <NotificationForm onSubmit={handleSendNotification} />
        </div>

        {/* History Section - Full width on mobile */}
        <div className="md:col-span-1">
          <NotificationHistory notifications={notifications} />
        </div>
      </div>

      {/* Mobile Stack for Small Screens */}
      <div className="md:hidden">{/* Already shown above */}</div>
    </div>
  )
}

