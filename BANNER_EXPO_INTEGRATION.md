# Trending Banner Integration Section for EXPO_INTEGRATION.md

**INSERT THIS AFTER THE CAROUSEL SECTION (after line ~150)**

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

**ALSO UPDATE THE API ENDPOINTS TABLE:**

Add this row to the "Public Endpoints" table:
```
| GET | `/api/banner/public` | Fetch active trending banner |
```

**UPDATE SECTION NUMBERS:**
- Current "2. Push Notifications" becomes "3. Push Notifications"
- Current "3. API Endpoints" becomes "4. API Endpoints"
- Current "4. Authentication" becomes "5. Authentication"
- Current "5. Testing Locally" becomes "6. Testing Locally"
- Current "6. Production Deployment" becomes "7. Production Deployment"
