# Expo App Integration Guide for FemAdmin Dashboard

This comprehensive guide explains how to integrate your Expo mobile app with the FemAdmin dashboard to display carousels, trending banners, and receive push notifications.

## Base URL

Replace `YOUR_ADMIN_DASHBOARD_URL` with your actual dashboard URL (e.g., `https://your-admin.vercel.app` or `http://localhost:3000` for local development).

```typescript
const API_BASE_URL = "YOUR_ADMIN_DASHBOARD_URL";
```

---

## 1. Carousel Integration

### Fetch Active Carousels

The dashboard provides a **public endpoint** (no authentication required) to fetch active carousel items.

#### Endpoint
```
GET /api/carousel/public?limit=10
```

#### Example Code

```typescript
// services/carousel.ts
import { API_BASE_URL } from './config';

export interface CarouselItem {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkType: string;
  linkValue: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchCarousels(limit: number = 10): Promise<CarouselItem[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/carousel/public?limit=${limit}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch carousels');
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching carousels:', error);
    throw error;
  }
}
```

#### Display Carousels in Your App

```typescript
// screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, Image, Text, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { fetchCarousels, CarouselItem } from '../services/carousel';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [carousels, setCarousels] = useState<CarouselItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadCarousels();
  }, []);

  const loadCarousels = async () => {
    try {
      const items = await fetchCarousels(10);
      setCarousels(items);
    } catch (error) {
      console.error('Failed to load carousels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCarouselPress = (item: CarouselItem) => {
    // Handle navigation based on linkType
    switch (item.linkType) {
      case 'product':
        navigation.navigate('Product', { id: item.linkValue });
        break;
      case 'category':
        navigation.navigate('Category', { id: item.linkValue });
        break;
      case 'external':
        Linking.openURL(item.linkValue);
        break;
      default:
        // No action for 'none'
        break;
    }
  };

  const renderCarouselItem = ({ item }: { item: CarouselItem }) => (
    <TouchableOpacity 
      onPress={() => handleCarouselPress(item)}
      style={{ width: width - 40, marginHorizontal: 20 }}
    >
      <Image 
        source={{ uri: item.imageUrl }} 
        style={{ width: '100%', height: 200, borderRadius: 12 }}
        resizeMode="cover"
      />
      <View style={{ padding: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.title}</Text>
        {item.subtitle && (
          <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
            {item.subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Text>Loading carousels...</Text>;
  }

  return (
    <View>
      <FlatList
        data={carousels}
        renderItem={renderCarouselItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
      />
    </View>
  );
}
```

---

## 2. Trending Banner Integration

### Fetch Active Banner

The dashboard provides a **public endpoint** (no authentication required) to fetch the active trending banner.

#### Endpoint
```
GET /api/banner/public
```

#### Example Code

```typescript
// services/banner.ts
import { API_BASE_URL } from './config';

export interface BannerItem {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkType: string;
  linkValue: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchBanner(): Promise<BannerItem | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/banner/public`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch banner');
    }
    
    // Returns null if no active banner
    return data.data || null;
  } catch (error) {
    console.error('Error fetching banner:', error);
    throw error;
  }
}
```

#### Display Banner in Your App

```typescript
// components/TrendingBanner.tsx
import React, { useEffect, useState } from 'react';
import { View, Image, Text, TouchableOpacity, Dimensions, Linking, StyleSheet } from 'react-native';
import { fetchBanner, BannerItem } from '../services/banner';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function TrendingBanner() {
  const [banner, setBanner] = useState<BannerItem | null>(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadBanner();
  }, []);

  const loadBanner = async () => {
    try {
      const bannerData = await fetchBanner();
      setBanner(bannerData);
    } catch (error) {
      console.error('Failed to load banner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerPress = () => {
    if (!banner) return;

    // Handle navigation based on linkType
    switch (banner.linkType) {
      case 'product':
        navigation.navigate('Product', { id: banner.linkValue });
        break;
      case 'category':
        navigation.navigate('Category', { id: banner.linkValue });
        break;
      case 'external':
        Linking.openURL(banner.linkValue);
        break;
      default:
        // No action for 'none'
        break;
    }
  };

  if (loading || !banner) {
    return null; // Don't show anything if no banner
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        onPress={handleBannerPress}
        activeOpacity={banner.linkType === 'none' ? 1 : 0.7}
      >
        <Image 
          source={{ uri: banner.imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          <Text style={styles.title}>{banner.title}</Text>
          {banner.subtitle && (
            <Text style={styles.subtitle}>{banner.subtitle}</Text>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  image: {
    width: width - 32,
    height: 150,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
});
```

#### Use in Home Screen

```typescript
// screens/HomeScreen.tsx
import React from 'react';
import { ScrollView } from 'react-native';
import TrendingBanner from '../components/TrendingBanner';
import CarouselSection from '../components/CarouselSection';

export default function HomeScreen() {
  return (
    <ScrollView>
      {/* Trending Banner at the top */}
      <TrendingBanner />
      
      {/* Carousel below */}
      <CarouselSection />
      
      {/* Rest of your content */}
    </ScrollView>
  );
}
```

---

## 3. Push Notifications Integration

### Prerequisites

Install required packages:

```bash
npx expo install expo-notifications expo-device
```

### Step 1: Register for Push Notifications

```typescript
// services/notifications.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { API_BASE_URL } from './config';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(authToken: string) {
  let token: string | undefined;

  if (!Device.isDevice) {
    alert('Must use physical device for Push Notifications');
    return undefined;
  }

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

  // Register token with backend
  try {
    const response = await fetch(`${API_BASE_URL}/api/expo/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`, // Your user's session token
      },
      body: JSON.stringify({ expoPushToken: token }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to register push token');
    }

    console.log('Push token registered successfully');
    return token;
  } catch (error) {
    console.error('Error registering push token:', error);
    throw error;
  }
}
```

### Step 2: Handle Notifications in App.tsx

```typescript
// App.tsx
import React, { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from './services/notifications';
import { useNavigation } from '@react-navigation/native';

export default function App() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const navigation = useNavigation();

  useEffect(() => {
    // Register for push notifications after user logs in
    // Replace 'YOUR_AUTH_TOKEN' with actual user session token
    const authToken = 'YOUR_AUTH_TOKEN'; // Get from your auth context/storage
    registerForPushNotifications(authToken);

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      
      // Handle deep linking
      if (data?.deepLinkType && data?.deepLinkValue) {
        handleDeepLink(data.deepLinkType, data.deepLinkValue);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  const handleDeepLink = (type: string, value: string) => {
    switch (type) {
      case 'product':
        navigation.navigate('Product', { id: value });
        break;
      case 'category':
        navigation.navigate('Category', { id: value });
        break;
      case 'external':
        Linking.openURL(value);
        break;
      default:
        console.log('Unknown deep link type:', type);
    }
  };

  return (
    // Your app components
  );
}
```

### Step 3: Test Push Notifications

1. **Run your Expo app** on a physical device (push notifications don't work on simulators)
2. **Log in** to ensure the push token is registered
3. **Go to your admin dashboard** at `YOUR_ADMIN_DASHBOARD_URL`
4. **Navigate to the Notifications tab**
5. **Create and send a notification**:
   - Enter a title and message
   - Optionally add an image URL
   - Select "All Users" as recipient
   - Choose a deep link type if needed
   - Click "Send Notification"

You should receive the notification on your device!

---

## 4. API Endpoints Reference

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/carousel/public?limit=10` | Fetch active carousel items |
| GET | `/api/banner/public` | Fetch active trending banner |

### Protected Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/expo/token` | Register Expo push token |
| DELETE | `/api/expo/token` | Remove Expo push token |
| GET | `/api/notifications` | Get all notifications |
| POST | `/api/notifications` | Create notification |
| POST | `/api/notifications/send` | Send notification to users |

---

## 5. Authentication

For protected endpoints, include the user's session token in the Authorization header:

```typescript
headers: {
  'Authorization': `Bearer ${userSessionToken}`,
  'Content-Type': 'application/json',
}
```

The session token is obtained when a user logs in via `/api/auth/login`.

---

## 6. Testing Locally

If testing with a local development server:

1. **Find your computer's local IP address**:
   - Windows: Run `ipconfig` and look for IPv4 Address
   - Mac/Linux: Run `ifconfig` and look for inet address

2. **Update API_BASE_URL**:
   ```typescript
   const API_BASE_URL = "http://192.168.1.XXX:3000"; // Replace with your IP
   ```

3. **Ensure your phone and computer are on the same network**

---

## 7. Production Deployment

When deploying to production:

1. **Deploy your admin dashboard** (e.g., to Vercel)
2. **Update API_BASE_URL** in your Expo app to the production URL
3. **Rebuild your Expo app** with the new API URL
4. **Test thoroughly** before releasing to users

---

## Support

For issues or questions:
- Check the admin dashboard logs for API errors
- Verify your database is properly configured
- Ensure `EXPO_ACCESS_TOKEN` is set in your `.env` file
- Test endpoints using tools like Postman or curl

---

**Built with ❤️ using Next.js and Expo**
