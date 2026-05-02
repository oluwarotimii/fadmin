# Referral System: App Integration Guide

This document explains how to integrate the Sales Executive Referral System with your mobile application to track facilitated downloads.

## 1. Overview
The goal is to notify the backend whenever a new user downloads and opens the app using a specific sales executive's code.

**Endpoint:** `POST /api/referral-events`  
**Authentication:** None (Public)

---

## 2. Integration Steps

### A. Capturing the Referral Code
You can capture the staff code in two ways:
1.  **Manual Input:** A "Referral Code" field on your sign-up or welcome screen.
2.  **Deep Links:** Sending the code via a URL (e.g., `yourapp://install?ref=JOHN4821`).

### B. Sending the Tracking Request
Trigger this request the **first time** the app is opened after an installation.

#### Request Body
| Field | Type | Description |
| :--- | :--- | :--- |
| `code` | `string` | **Required.** The unique staff code (e.g., "JOHN4821"). |
| `device_id` | `string` | **Recommended.** A unique ID for the phone to prevent duplicate counts. |
| `platform` | `string` | **Optional.** Either `"ios"` or `"android"`. |

#### JavaScript / React Native Example
```javascript
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const trackReferral = async (referralCode) => {
  try {
    const response = await fetch('https://your-api-url.com/api/referral-events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: referralCode,
        device_id: Device.osBuildId || Device.modelId, // Use a persistent device ID
        platform: Platform.OS, // 'ios' or 'android'
      }),
    });

    const data = await response.json();
    
    if (data.success) {
      console.log("Download attributed successfully");
      // Optional: Store locally that we've already tracked this device
      // await AsyncStorage.setItem('referral_tracked', 'true');
    }
  } catch (error) {
    console.error("Referral tracking failed:", error);
  }
};
```

---

## 3. Best Practices

### 1. Prevent Duplicate Counting
The backend already checks the `device_id` to ensure a staff member isn't credited twice for the same phone. However, to save user data and battery, you should store a flag in `AsyncStorage` (or `SharedPreferences`) after a successful track so the app doesn't attempt to call the API on every subsequent launch.

### 2. Memorable Codes
When using the **Bulk Import** feature in the Admin Panel, the system generates codes like `NAME1234`. These are designed to be easy for sales executives to remember and type manually if deep links fail.

### 3. Timing
Call the API as early as possible (e.g., in `useEffect` of your main `App.js` or `index.js`), but only if a code is present.

---

## 4. Testing the Integration
You can simulate an app download using `curl`:

```bash
curl -X POST https://your-api-url.com/api/referral-events \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TEST_CODE",
    "device_id": "test-device-123",
    "platform": "ios"
  }'
```

After running this, check the **Referral System** tab in your Admin Dashboard. You should see the count for that code increase immediately.
