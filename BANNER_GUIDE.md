# Trending Banner Feature - Quick Guide

## ✅ What's New

Added a **Trending Banner** feature to display a single promotional banner in your Expo app.

### Features
- ✅ Upload banner image via URL
- ✅ Preview current banner in admin dashboard
- ✅ Only one active banner at a time (auto-replaces previous)
- ✅ Public API for Expo app (no auth required)
- ✅ Remove banner functionality

---

## 🎯 How to Use

### In Admin Dashboard

1. **Navigate to Banner Tab**
   - Click "Trending Banner" in the navigation

2. **Upload Banner**
   - Enter image URL (e.g., `https://example.com/banner.jpg`)
   - Click "Upload Banner"
   - Previous banner is automatically deactivated

3. **Preview**
   - See current banner in the right panel
   - View upload date and status

4. **Remove**
   - Click "Remove Banner" to deactivate current banner

---

## 📱 Expo App Integration

### Fetch Banner

```typescript
// services/banner.ts
const API_BASE_URL = "YOUR_ADMIN_DASHBOARD_URL";

export interface TrendingBanner {
  id: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchTrendingBanner(): Promise<TrendingBanner | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/banner/public`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch banner');
    }
    
    return data.data; // Returns null if no active banner
  } catch (error) {
    console.error('Error fetching banner:', error);
    return null;
  }
}
```

### Display Banner in App

```typescript
// screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { fetchTrendingBanner, TrendingBanner } from '../services/banner';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [banner, setBanner] = useState<TrendingBanner | null>(null);

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    const data = await fetchTrendingBanner();
    setBanner(data);
  };

  if (!banner) {
    return null; // Don't show anything if no banner
  }

  return (
    <View style={{ padding: 16 }}>
      <Image 
        source={{ uri: banner.imageUrl }} 
        style={{ 
          width: width - 32, 
          height: (width - 32) * 9 / 16, // 16:9 aspect ratio
          borderRadius: 12 
        }}
        resizeMode="cover"
      />
    </View>
  );
}
```

---

## 🔌 API Endpoint

### Public Endpoint (No Auth)

```
GET /api/banner/public
```

**Response (with active banner):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "imageUrl": "https://example.com/banner.jpg",
    "createdAt": "2025-11-28T08:00:00.000Z",
    "updatedAt": "2025-11-28T08:00:00.000Z"
  }
}
```

**Response (no active banner):**
```json
{
  "success": true,
  "data": null
}
```

---

## 🗄️ Database

The `trending_banner` table stores banner history:
- Only ONE banner is active at a time
- Previous banners are set to `inactive` status
- New uploads automatically replace the active banner

---

## 💡 Use Cases

- **Flash Sales**: Promote limited-time offers
- **New Arrivals**: Showcase latest products
- **Events**: Advertise upcoming events
- **Seasonal Campaigns**: Holiday promotions
- **Announcements**: Important app updates

---

## 📝 Notes

- **Image Recommendations**:
  - Aspect ratio: 16:9 (e.g., 1920x1080px)
  - Format: JPG or PNG
  - Size: Under 500KB for fast loading
  - Host on CDN for best performance

- **Update Frequency**:
  - Change banner as often as needed
  - No limit on uploads
  - Old banners are kept in database (inactive)

---

**Ready to promote! 🎉**
