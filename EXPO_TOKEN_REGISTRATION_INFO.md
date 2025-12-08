# Expo Token Registration Guide - Simplified

## Overview

This document explains how Expo push token registration works in the FemAdmin dashboard after simplification. The endpoint is now public and doesn't require authentication.

## Expo Token Registration Process (Simplified)

### Registering an Expo Push Token

**Endpoint:** `POST /api/expo/token`

**Authentication Required:** No (Public endpoint)

**Request:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Headers:**
```
Content-Type: application/json
```

**How it Works:**
1. The system validates that the `expoPushToken` parameter is provided
2. It validates the token format (must start with "ExpoPushToken[" and end with "]")
3. It creates or updates a system user record ('system@mobileapp.com') containing all registered Expo push tokens
4. The token is added to the collection for broadcasting to all mobile app users

**Response:**
```json
{
  "success": true,
  "message": "Expo push token registered successfully"
}
```

### Removing an Expo Push Token

**Endpoint:** `DELETE /api/expo/token`

**Authentication Required:** No (Public endpoint)

**Request:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Headers:**
```
Content-Type: application/json
```

**How it Works:**
1. The system removes the specified token from the system user's push_tokens list
2. Updates the system user record in the database

## Expo Push Token Format

Valid Expo push tokens must follow this format:
- Example: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
- Must start with "ExpoPushToken["
- Must end with "]"
- The content between brackets is the actual Expo push token

## Integration with Expo App

In your Expo app, you would:

1. Request push notification permissions
2. Get the Expo push token using `Notifications.getExpoPushTokenAsync()`
3. Register this token with your FemAdmin dashboard using the `/api/expo/token` endpoint
4. No authentication required - simply send the token in the request body

## Environment Configuration

Make sure your `.env` file contains:
```
EXPO_ACCESS_TOKEN=your_expo_access_token
```

To get an Expo access token:
1. Go to https://expo.dev
2. Login to your account
3. Navigate to Account Settings → Access Tokens
4. Create a new token with appropriate permissions

## Summary

- The Expo token registration endpoint is now public (no authentication required)
- All mobile app tokens are stored in a system user account ('system@mobileapp.com')
- Dashboard admins can send notifications to all registered tokens
- Mobile app users do not need individual dashboard accounts
- Simplified integration for mobile app push notification registration