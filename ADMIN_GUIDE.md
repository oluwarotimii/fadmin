# FemAdmin Dashboard - Complete Admin Guide

A comprehensive guide for managing your Expo mobile app through the FemAdmin dashboard.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Push Notifications](#push-notifications)
3. [Carousel Management](#carousel-management)
4. [Trending Banner](#trending-banner)
5. [API Integration](#api-integration)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Dashboard

1. Navigate to your dashboard URL (e.g., `http://localhost:3000`)
2. Sign in with your credentials or create a new account
3. You'll see three main modules in the navigation tabs

### Dashboard Overview

The dashboard provides three key features:
- **Push Notifications**: Send targeted messages to your app users
- **Carousel**: Manage rotating banners on your app's home screen
- **Trending Banner**: Display a prominent banner for special promotions

---

## Push Notifications

### What are Push Notifications?

Push notifications are messages sent directly to users' devices, even when they're not actively using your app. They're perfect for:
- Announcing new features or products
- Promoting special offers
- Engaging inactive users
- Sharing important updates

### Creating a Push Notification

1. **Navigate to Push Notifications Tab**
   - Click "Push Notifications" in the top navigation

2. **Fill Out the Form**
   - **Title** (required): The notification headline (max 50 characters)
     - Example: "50% Off Sale Today!"
   - **Message** (required): The notification body (max 200 characters)
     - Example: "Don't miss our biggest sale of the year. Shop now!"
   - **Deep Link** (optional): Where users go when they tap the notification
     - Format: `screen://ScreenName` or `product://123`
     - Examples:
       - `products://featured` - Opens featured products
       - `category://electronics` - Opens electronics category
       - `product://456` - Opens specific product
       - Leave empty to open the app home screen

3. **Send the Notification**
   - Click "Send Notification"
   - Notification is sent immediately to all registered devices
   - You'll see a success message when sent

### Viewing Notification History

- All sent notifications appear in the list on the right
- Each entry shows:
  - Title and message
  - Deep link (if any)
  - Timestamp
  - Sent by (admin email)
- Notifications are sorted by most recent first

### Best Practices

✅ **Do:**
- Keep titles short and attention-grabbing
- Write clear, actionable messages
- Use deep links to direct users to relevant content
- Test notifications before major campaigns

❌ **Don't:**
- Send too many notifications (avoid spam)
- Use ALL CAPS or excessive emojis
- Send notifications at odd hours
- Make promises you can't keep

---

## Carousel Management

### What is the Carousel?

The carousel displays rotating image banners on your app's home screen. It's ideal for:
- Showcasing featured products
- Promoting sales or events
- Highlighting new arrivals
- Directing users to specific categories

### Creating a Carousel Item

1. **Navigate to Carousel Tab**
   - Click "Carousel" in the top navigation

2. **Fill Out the Form**
   - **Title** (required): Main heading on the banner
     - Example: "Summer Collection"
   - **Subtitle** (optional): Supporting text
     - Example: "Fresh styles for the season"
   - **Image URL** (required): Direct link to your banner image
     - Recommended size: 1200x600px
     - Format: JPG or PNG
     - Example: `https://example.com/images/summer-banner.jpg`
   - **Link Type**: What happens when users tap the banner
     - **None**: No action (display only)
     - **Product**: Links to a specific product
     - **Category**: Links to a product category
     - **External**: Opens a web URL
   - **Link Value**: The destination (depends on link type)
     - For Product: Enter product ID (e.g., `123`)
     - For Category: Enter category slug (e.g., `electronics`)
     - For External: Enter full URL (e.g., `https://example.com/sale`)

3. **Add the Item**
   - Click "Add Carousel Item"
   - Item appears in the list on the right

### Managing Carousel Items

#### Reordering Items
- Click **↑** (up arrow) to move item higher in the carousel
- Click **↓** (down arrow) to move item lower
- Top item displays first in the app

#### Activating/Deactivating
- Click the **toggle switch** to activate/deactivate
- **Active** (green): Visible in the app
- **Inactive** (gray): Hidden from users
- Use this to temporarily hide items without deleting them

#### Deleting Items
- Click the **trash icon** to delete
- Confirm the deletion
- This action cannot be undone

### Carousel Best Practices

✅ **Do:**
- Use high-quality, eye-catching images
- Keep 3-5 active items for optimal performance
- Update regularly to keep content fresh
- Test links before activating items
- Use consistent image dimensions

❌ **Don't:**
- Upload extremely large images (>500KB)
- Leave broken or invalid links
- Have too many active items (slows down app)
- Use low-resolution or blurry images

---

## Trending Banner

### What is the Trending Banner?

The trending banner is a single, prominent banner displayed at the top of specific app screens. Perfect for:
- Limited-time offers
- Major announcements
- Seasonal campaigns
- Featured collections

### Creating a Trending Banner

1. **Navigate to Trending Banner Tab**
   - Click "Trending Banner" in the top navigation

2. **Fill Out the Form**
   - **Title** (required): Main banner headline
     - Example: "Black Friday Sale"
   - **Subtitle** (optional): Additional context
     - Example: "Up to 70% off everything"
   - **Image URL** (required): Banner image link
     - Recommended size: 1200x400px
     - Format: JPG or PNG
   - **Link Type & Value**: Same as carousel (see above)

3. **Activate the Banner**
   - Click "Add Banner"
   - Only ONE banner can be active at a time
   - New banner replaces the previous one

### Managing the Banner

#### Updating the Banner
- Create a new banner to replace the current one
- The newest banner is always displayed

#### Deactivating the Banner
- Click the toggle switch to deactivate
- Banner disappears from the app
- You can reactivate it later

#### Deleting the Banner
- Click the trash icon
- Confirm deletion
- This removes the banner permanently

### Banner Best Practices

✅ **Do:**
- Use bold, high-contrast designs
- Include a clear call-to-action
- Update for current promotions
- Use compelling imagery
- Test on different screen sizes

❌ **Don't:**
- Leave outdated promotions active
- Use cluttered or busy designs
- Forget to add a link (unless display-only)
- Use images with important text at the edges

---

## API Integration

### For Developers

The dashboard provides REST APIs that your Expo app can consume.

#### Public Endpoints (No Auth Required)

**Get Active Carousel Items**
```
GET /api/carousel/public
```

**Get Active Banner**
```
GET /api/banner/public
```

#### Authenticated Endpoints

All other endpoints require authentication via session token.

**Push Notifications**
```
POST /api/notifications
GET /api/notifications
```

**Carousel Management**
```
GET /api/carousel
POST /api/carousel
PUT /api/carousel/:id
DELETE /api/carousel/:id
PUT /api/carousel/:id/status
```

**Banner Management**
```
GET /api/banner
POST /api/banner
PUT /api/banner/:id
DELETE /api/banner/:id
PUT /api/banner/:id/status
```

For detailed API documentation and Expo integration, see [EXPO_INTEGRATION.md](./EXPO_INTEGRATION.md).

---

## Troubleshooting

### Common Issues

#### "Failed to send notification"
- **Cause**: No devices registered for push notifications
- **Solution**: Ensure users have granted notification permissions in the app

#### "Image not loading"
- **Cause**: Invalid image URL or CORS issues
- **Solution**: 
  - Verify the URL is publicly accessible
  - Use HTTPS URLs
  - Check image file format (JPG/PNG)

#### "Link not working"
- **Cause**: Incorrect link format or value
- **Solution**:
  - For products: Use numeric ID only
  - For categories: Use exact category slug
  - For external: Include full URL with `https://`

#### "Carousel items not appearing in app"
- **Cause**: Items are inactive or app cache
- **Solution**:
  - Verify items are toggled to "active"
  - Restart the Expo app
  - Check app is fetching from correct API endpoint

#### "Database connection timeout"
- **Cause**: Network issues or database unavailable
- **Solution**:
  - Check your internet connection
  - Verify database credentials in `.env` file
  - Wait a moment and try again

### Getting Help

If you encounter issues not covered here:
1. Check the browser console for error messages
2. Review the terminal logs for API errors
3. Verify your `.env` configuration
4. Consult the [EXPO_INTEGRATION.md](./EXPO_INTEGRATION.md) for technical details

---

## Quick Reference

### Image Specifications

| Element | Recommended Size | Format | Max File Size |
|---------|-----------------|--------|---------------|
| Carousel | 1200x600px | JPG/PNG | 500KB |
| Banner | 1200x400px | JPG/PNG | 500KB |

### Link Type Examples

| Link Type | Link Value Example | Result |
|-----------|-------------------|--------|
| None | - | No action |
| Product | `123` | Opens product #123 |
| Category | `electronics` | Opens electronics category |
| External | `https://example.com` | Opens website |

### Character Limits

| Field | Max Characters |
|-------|---------------|
| Notification Title | 50 |
| Notification Message | 200 |
| Carousel Title | 100 |
| Carousel Subtitle | 200 |
| Banner Title | 100 |
| Banner Subtitle | 200 |

---

## Tips for Success

1. **Plan Your Content**: Schedule carousel and banner updates in advance
2. **Monitor Engagement**: Track which notifications and banners drive the most engagement
3. **Keep It Fresh**: Update content regularly to maintain user interest
4. **Test Everything**: Always verify links and images before activating
5. **Be Strategic**: Don't overwhelm users with too many notifications or carousel items
6. **Use Analytics**: Monitor app analytics to see what content performs best

---

**Need more technical details?** See [EXPO_INTEGRATION.md](./EXPO_INTEGRATION.md) for developer documentation.
