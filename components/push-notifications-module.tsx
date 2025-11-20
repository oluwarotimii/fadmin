"use client"

import { useState } from "react"
import NotificationForm from "@/components/notification-form"
import NotificationHistory from "@/components/notification-history"

export default function PushNotificationsModule() {
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "New Products Available",
      message: "Check out our latest collection",
      timestamp: new Date(Date.now() - 3600000),
      status: "delivered",
    },
  ])

  const handleSendNotification = (data: any) => {
    const newNotification = {
      id: String(notifications.length + 1),
      ...data,
      timestamp: new Date(),
      status: "sent",
    }
    setNotifications([newNotification, ...notifications])
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
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
