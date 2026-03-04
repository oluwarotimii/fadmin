# Push Notification Test Endpoint Documentation

## Overview
This test endpoint sends push notifications with the **exact same payload structure** as the production endpoint. Use it to test deep linking in your mobile app.

## Endpoint
```
POST /api/notifications/test-deep-link
```

## Request Body

```json
{
  "expoPushToken": "ExponentPushToken[@your-project-id-...]",
  "title": "Test Notification",
  "body": "This is a test deep link notification",
  "deepLinkType": "screen",
  "deepLinkValue": "/settings",
  "deployment": "preview"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `expoPushToken` | string | ✅ Yes | The Expo push token from your mobile app |
| `title` | string | ✅ Yes | Notification title |
| `body` | string | ✅ Yes | Notification message body |
| `deepLinkType` | string | ❌ No | Type of deep link: `"screen"`, `"content"`, `"url"`, or `"none"` |
| `deepLinkValue` | string | ❌ No | The target value (screen path, content ID, or URL) |
| `deployment` | string | ❌ No | For your reference: `"preview"`, `"staging"`, `"production"`, `"development"` |

## Response

### Success (200 OK)
```json
{
  "success": true,
  "message": "Test notification sent successfully",
  "data": {
    "notificationId": 123,
    "ticket": { ... },
    "payload": {
      "to": "ExponentPushToken[@...]",
      "sound": "default",
      "title": "Test Notification",
      "body": "This is a test deep link notification",
      "data": {
        "deepLinkType": "screen",
        "deepLinkValue": "/settings",
        "notificationId": "test-1234567890",
        "deployment": "preview"
      }
    },
    "sent": {
      "to": "ExponentPushToken[@...]",
      "title": "Test Notification",
      "body": "This is a test deep link notification",
      "deepLinkType": "screen",
      "deepLinkValue": "/settings",
      "deployment": "preview"
    }
  }
}
```

### Error (400/401/500)
```json
{
  "error": "Error message here",
  "hint": "Optional hint to fix the issue"
}
```

## Payload Structure (What Mobile App Receives)

The mobile app receives this exact structure:

```javascript
{
  to: "ExponentPushToken[@your-project-id-...]",
  sound: "default",
  title: "Your Title",
  body: "Your Message",
  data: {
    deepLinkType: "screen | content | url | none",
    deepLinkValue: "/screen-path or content-id or URL",
    notificationId: "test-1234567890",
    deployment: "preview | staging | production"
  }
}
```

## Deep Link Types

### 1. Screen Navigation
```json
{
  "deepLinkType": "screen",
  "deepLinkValue": "/settings"
}
```
**Mobile App Action:** Navigate to the settings screen

### 2. Content Opening
```json
{
  "deepLinkType": "content",
  "deepLinkValue": "post-123"
}
```
**Mobile App Action:** Open the specific content/post with ID "post-123"

### 3. External URL
```json
{
  "deepLinkType": "url",
  "deepLinkValue": "https://example.com"
}
```
**Mobile App Action:** Open the URL in browser or in-app webview

### 4. No Deep Link
```json
{
  "deepLinkType": "none",
  "deepLinkValue": ""
}
```
**Mobile App Action:** Just show the notification, no navigation

## Usage Examples

### Using cURL
```bash
curl -X POST https://your-domain.com/api/notifications/test-deep-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "expoPushToken": "ExponentPushToken[@your-project-id-...]",
    "title": "Test Deep Link",
    "body": "Click to navigate to settings",
    "deepLinkType": "screen",
    "deepLinkValue": "/settings",
    "deployment": "preview"
  }'
```

### Using JavaScript/Fetch
```javascript
const response = await fetch('/api/notifications/test-deep-link', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    expoPushToken: 'ExponentPushToken[@...]',
    title: 'Test Notification',
    body: 'Testing deep link',
    deepLinkType: 'screen',
    deepLinkValue: '/settings',
    deployment: 'preview'
  })
});

const result = await response.json();
console.log(result);
```

### Using the Admin UI
1. Go to the admin panel
2. Click on **"Test Deep Link"** tab
3. Enter your Expo push token
4. Fill in title and body
5. Select deep link type and value
6. Choose deployment environment
7. Click "Send Test Notification"

## Mobile App Integration

### React Native / Expo Example

```typescript
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

// Add notification response listener
Notifications.addNotificationResponseReceivedListener(response => {
  const data = response.notification.request.content.data;
  
  if (data?.deepLinkType && data?.deepLinkValue) {
    handleDeepLink(data.deepLinkType, data.deepLinkValue);
  }
});

function handleDeepLink(type: string, value: string) {
  switch (type) {
    case 'screen':
      // Navigate to screen
      navigation.navigate(value.replace('/', '')); // e.g., 'settings'
      break;
    
    case 'content':
      // Open content detail
      navigation.navigate('ContentDetail', { id: value });
      break;
    
    case 'url':
      // Open external URL
      Linking.openURL(value);
      break;
    
    case 'none':
      // Do nothing, just dismiss notification
      break;
  }
}
```

## Getting Your Expo Push Token

### From Mobile App Console
```typescript
import * as Notifications from 'expo-notifications';

async function getPushToken() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Permission not granted');
    return;
  }
  
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Expo push token:', token);
  return token;
}
```

### From Token Registration Endpoint
Your app should register tokens at: `POST /api/expo/token`

```json
{
  "expoPushToken": "ExponentPushToken[@...]",
  "userId": 123,
  "deviceInfo": { ... }
}
```

## Troubleshooting

### Notification Not Received
1. Check if the Expo push token is valid (starts with `ExponentPushToken[`)
2. Ensure the device has notification permissions enabled
3. Verify the `EXPO_ACCESS_TOKEN` environment variable is set

### Deep Link Not Working
1. Verify `deepLinkType` and `deepLinkValue` are correctly set
2. Check if the mobile app has the notification response listener registered
3. Ensure the screen/content routes match what your app expects
4. Test with a physical device (simulators may have limitations)

### Invalid Token Error
- Token format: `ExponentPushToken[@project-id-unique-id]`
- Make sure you're using the token from a physical device
- Tokens from simulators may not work

## Production vs Test Endpoint

| Feature | Test Endpoint | Production Endpoint |
|---------|--------------|---------------------|
| Endpoint | `/api/notifications/test-deep-link` | `/api/notifications/send` |
| Recipients | Single token (manual) | Multiple tokens (from DB) |
| Use Case | Development & Testing | Production sends |
| Payload Structure | ✅ Identical | ✅ Identical |
| Deep Link Support | ✅ Full | ✅ Full |

Both endpoints send the **exact same payload structure** to ensure testing accuracy.
