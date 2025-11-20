interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  status: "sent" | "delivered" | "failed"
}

interface NotificationHistoryProps {
  notifications: Notification[]
}

export default function NotificationHistory({ notifications }: NotificationHistoryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 md:p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Recent Notifications</h2>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No notifications sent yet</p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="p-3 border border-border rounded-md bg-background hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-foreground text-sm">{notification.title}</h3>
                <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getStatusColor(notification.status)}`}>
                  {notification.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
              <p className="text-xs text-muted-foreground">
                {notification.timestamp.toLocaleDateString()} at {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
