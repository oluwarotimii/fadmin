// expo-client-utils.ts - Client-side utility functions for Expo push notifications

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

// Request notification permissions and get the Expo push token
export async function registerForPushNotificationsAsync() {
  let token: string | undefined;

  if (Device.isDevice) {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return undefined;
    }

    // Get the Expo push token
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log('Expo push token:', token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}

// Register the Expo push token with your backend
export async function registerTokenWithBackend(token: string) {
  try {
    const response = await fetch('/api/expo/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`, // You'll need to implement this function to get user's auth token
      },
      body: JSON.stringify({ expoPushToken: token }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error registering push token:', data.error);
      throw new Error(data.error || 'Failed to register push token');
    }

    console.log('Push token registered successfully');
    return data;
  } catch (error) {
    console.error('Error registering push token:', error);
    throw error;
  }
}

// Helper function to get auth token (implement based on your auth system)
function getAuthToken() {
  // This is a placeholder - implement based on how you store user tokens
  // For example, you might retrieve it from cookies, localStorage, or a global state
  return localStorage?.getItem('session') || null;
}

// Function to handle notification received when app is in foreground
export function handleNotificationReceived() {
  // Set notification handler for foreground notifications
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

  if (token) {
    // Register with backend
    try {
      await registerTokenWithBackend(token);
    } catch (error) {
      console.error('Failed to register token with backend:', error);
    }
  }

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
function handleDeepLink(type: string, value: string) {
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