# API Testing Guide

This document provides instructions for testing the FemAdmin dashboard API endpoints.

## Prerequisites

- Admin dashboard running at `http://localhost:3000` (or your deployed URL)
- A registered user account
- Session token from login

## 1. Authentication

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "id": 1,
  "email": "admin@example.com",
  "token": "your-session-token-here"
}
```

Save the `token` for subsequent requests.

---

## 2. Carousel Endpoints

### Get All Carousels (Authenticated)

```bash
curl -X GET http://localhost:3000/api/carousel \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Get Public Carousels (No Auth Required)

```bash
curl -X GET "http://localhost:3000/api/carousel/public?limit=10"
```

### Create Carousel Item

```bash
curl -X POST http://localhost:3000/api/carousel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Summer Sale",
    "subtitle": "Up to 50% off",
    "image_url": "https://example.com/summer-sale.jpg",
    "link_type": "category",
    "link_value": "summer-collection",
    "position": 1
  }'
```

### Update Carousel Item

```bash
curl -X PUT http://localhost:3000/api/carousel/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "title": "Updated Summer Sale",
    "position": 2
  }'
```

### Update Carousel Status

```bash
curl -X PUT http://localhost:3000/api/carousel/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "status": "inactive"
  }'
```

### Delete Carousel Item

```bash
curl -X DELETE http://localhost:3000/api/carousel/1 \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

---

## 3. Notification Endpoints

### Get All Notifications

```bash
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

### Create Notification

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "title": "New Products Available",
    "message": "Check out our latest collection!",
    "image_url": "https://example.com/notification.jpg",
    "deep_link_type": "category",
    "deep_link_value": "new-arrivals",
    "recipient_type": "all"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "created_at": "2025-11-28T08:00:00.000Z",
    "updated_at": "2025-11-28T08:00:00.000Z"
  }
}
```

### Send Notification

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "notificationId": 1
  }'
```

---

## 4. Expo Push Token Registration

### Register Expo Push Token

```bash
curl -X POST http://localhost:3000/api/expo/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  }'
```

### Remove Expo Push Token

```bash
curl -X DELETE http://localhost:3000/api/expo/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  }'
```

---

## 5. Testing via Admin Dashboard UI

1. **Start the development server:**
   ```bash
   pnpm dev
   ```

2. **Open browser:** Navigate to `http://localhost:3000`

3. **Login:** Use your registered credentials

4. **Test Carousel Management:**
   - Click on "Carousel" tab
   - Fill in the form with carousel details
   - Click "Add Item"
   - Verify the item appears in the list
   - Test toggle status, reorder, and delete

5. **Test Notification Management:**
   - Click on "Notifications" tab
   - Fill in the notification form
   - Click "Send Notification"
   - Check the notification history

6. **Verify Public API:**
   - Open a new browser tab (or use curl)
   - Navigate to `http://localhost:3000/api/carousel/public`
   - Verify you can see active carousels without authentication

---

## 6. Common Issues

### "Authorization token required"
- Ensure you're including the session token in the Authorization header
- Format: `Authorization: Bearer YOUR_TOKEN`

### "Invalid or expired session"
- Session tokens expire after 7 days
- Login again to get a new token

### "No Expo push tokens found for recipients"
- At least one user must have registered an Expo push token
- Use the `/api/expo/token` endpoint to register a token first

### "Failed to send some notifications"
- Check that `EXPO_ACCESS_TOKEN` is set in your `.env` file
- Verify the Expo push tokens are valid
- Check the server logs for detailed error messages

---

## 7. Environment Variables

Ensure these are set in your `.env` file:

```env
DATABASE_URL=your_neon_postgres_connection_string
NEXTAUTH_SECRET=your_random_secret_key
EXPO_ACCESS_TOKEN=your_expo_access_token
```

To get an Expo access token:
1. Go to https://expo.dev
2. Login to your account
3. Navigate to Access Tokens
4. Create a new token
5. Copy and paste it into your `.env` file

---

**Happy Testing! 🚀**
