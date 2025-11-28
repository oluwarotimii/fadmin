# Expo Push Notifications Integration Guide

This document explains how to integrate Expo push notifications with your mobile application and connect it with the admin dashboard.

## Prerequisites

- Expo account and project set up
- Expo CLI or EAS CLI installed
- Admin dashboard deployed and accessible

## Setting up Expo Push Notifications

### 1. Install Required Packages in Your Expo App

```bash
npx expo install expo-notifications expo-device
```

### 2. Configure app.json/app.config.js

Add notification permissions to your app configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "iosDisplayInForeground": true,
          "defaultAction": "default",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### 3. Register for Push Notifications (React Native Component)

```javascript
import React, { useEffect } from 'react';
import { registerForPushNotificationsAsync, 
         initializePushNotifications, 
         handleNotificationResponse } from './path/to/push-notification-utils';

export default function App() {
  useEffect(() => {
    // Initialize push notifications
    initializePushNotifications();
    
    // Handle notification responses
    const unsubscribe = handleNotificationResponse();
    
    // Cleanup listener on unmount
    return unsubscribe;
  }, []);

  return (
    // Your app components
  );
}
```

### 4. Push Notification Utility File (push-notification-utils.js)

```javascript
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import axios from 'axios';

// Request notification permissions and get the Expo push token
export async function registerForPushNotificationsAsync() {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo push token:', token);
    
    // Register token with your backend
    await registerTokenWithBackend(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Register the Expo push token with your backend
export async function registerTokenWithBackend(token) {
  try {
    // You'll need to implement authentication in your app
    const authToken = await getAuthToken(); // Implement this based on your auth system
    
    const response = await axios.post(
      'https://your-admin-dashboard.com/api/expo/token', 
      { expoPushToken: token },
      { 
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Push token registered successfully');
    return response.data;
  } catch (error) {
    console.error('Error registering push token:', error);
    throw error;
  }
}

// Helper function to get auth token (implement based on your auth system)
async function getAuthToken() {
  // This is a placeholder - implement based on how you store user tokens
  // For example, you might retrieve it from secure storage
  // return await SecureStore.getItemAsync('authToken');
  return null;
}

// Function to handle notification received when app is in foreground
export function handleNotificationReceived() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Request permissions and register token automatically
export async function initializePushNotifications() {
  // Handle notifications when received
  handleNotificationReceived();

  // Get the push token
  const token = await registerForPushNotificationsAsync();

  return token;
}

// Function to handle deep linking when notification is tapped
export function handleNotificationResponse() {
  // Add listener for when a notification is tapped
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification data:', data);
    
    // Handle deep linking based on notification data
    if (data?.deepLinkType && data?.deepLinkValue) {
      handleDeepLink(data.deepLinkType, data.deepLinkValue);
    }
  });

  // Cleanup listener on unmount
  return () => {
    Notifications.removeNotificationSubscription(responseListener);
  };
}

// Handle deep linking logic
function handleDeepLink(type, value) {
  // Implement navigation logic based on deep link type and value
  // For example:
  // if (type === 'screen') navigate(value);
  // if (type === 'content') openContent(value);
  console.log(`Handling deep link: ${type} -> ${value}`);
}

export default {
  registerForPushNotificationsAsync,
  registerTokenWithBackend,
  initializePushNotifications,
  handleNotificationResponse,
};
```

## Using the Admin Dashboard API

### 1. Authentication

All API endpoints require authentication. Include the session token in the Authorization header:

```javascript
const response = await fetch('/api/notifications', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  }
});
```

### 2. Creating a Notification

```javascript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Update Available',
    message: 'Check out our latest features',
    image_url: 'https://example.com/image.jpg',
    deep_link_type: 'screen',
    deep_link_value: 'update-screen',
    recipient_type: 'all' // 'all', 'specific'
  })
});
```

### 3. Sending a Notification

```javascript
const response = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    notificationId: 123
  })
});
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `400`: Bad request (validation error)
- `401`: Unauthorized (invalid session)
- `404`: Not found
- `500`: Server error

## Testing Push Notifications

You can test push notifications to a single device using the test endpoint:

```javascript
const response = await fetch('/api/notifications/test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    expoPushToken: 'ExpoPushToken[YourTokenHere]',
    title: 'Test Notification',
    body: 'This is a test notification',
    data: { deepLinkType: 'test', deepLinkValue: 'value' }
  })
});
```

## Troubleshooting

1. **Invalid Push Token**: Make sure push tokens have the format `ExpoPushToken[...]`
2. **Authentication Errors**: Verify session tokens are valid and not expired
3. **Permission Issues**: On iOS, ensure notification permissions are granted
4. **Network Issues**: Confirm the admin dashboard is accessible from the mobile device

## Security Best Practices

- Always use HTTPS in production
- Validate all inputs server-side
- Store push tokens securely
- Implement proper session management
- Regularly clean up expired push tokens from the database

## References

- [Expo Push Notifications Documentation](https://docs.expo.dev/push-notifications/overview/)
- [Expo Server SDK Documentation](https://docs.expo.dev/push-notifications/sending-notifications/)