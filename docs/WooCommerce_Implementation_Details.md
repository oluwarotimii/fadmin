# WooCommerce Integration Implementation in Mobile App

## Overview

This document provides a detailed explanation of how WooCommerce has been integrated into the mobile application. The implementation provides a full e-commerce solution that connects to WordPress/WooCommerce sites using the REST API, with a fallback to dummy data for development purposes.

## Configuration and Environment Variables

The application uses environment variables configured through the `app.json` file which is the standard approach for Expo applications:

```json
{
  "expo": {
    // ...
    "extra": {
      "expoPublicWordpressConsumerKey": "ck_03fa4b83972b0bffeed920fa435b36c5ce2da7d4",
      "expoPublicWordpressConsumerSecret": "cs_dba4839b4024395a99b4d06ab554650b60dedd6b",
      "expoPublicApiServiceType": "wordpress",
      "expoPublicWordpressUrl": "https://femtech.ng/",
      "expoPublicDashboardUrl": "https://femapp.vercel.app"
    }
  }
}
```

The configuration is accessed using Expo's Constants API:

```typescript
import Constants from 'expo-constants';

const { expoPublicApiServiceType, expoPublicWordpressUrl, expoPublicWordpressConsumerKey, expoPublicWordpressConsumerSecret } = Constants.expoConfig?.extra || {};

// Fallback for development
const API_SERVICE_TYPE = expoPublicApiServiceType || process.env.EXPO_PUBLIC_API_SERVICE_TYPE || 'wordpress';
```

## WordPress API Service Implementation

The core of the WooCommerce integration is the `WordPressApiService` class which handles all communication with the WooCommerce REST API:

### Authentication and Initialization

```typescript
class WordPressApiService {
  sessionToken: string | null;
  private api: AxiosInstance;
  private isUserLoggedIn: boolean;
  private wordpressUrl: string;
  private jwtEndpoint: string;
  private consumerKey: string;
  private consumerSecret: string;

  constructor(wordpressUrl: string, consumerKey: string, consumerSecret: string, sessionToken: string | null = null) {
    // Ensure wordpressUrl doesn't end with a slash to avoid double slash in URL
    const cleanWordpressUrl = wordpressUrl.endsWith('/') ? wordpressUrl.slice(0, -1) : wordpressUrl;

    // Log for debugging to verify credentials are being passed
    console.log('Initializing WordPress API Service:', {
      wordpressUrl: cleanWordpressUrl,
      hasConsumerKey: !!consumerKey,
      hasConsumerSecret: !!consumerSecret,
      consumerKeyLength: consumerKey ? consumerKey.length : 0,
      consumerSecretLength: consumerSecret ? consumerSecret.length : 0
    });

    // Validate that we have the necessary credentials
    if (!consumerKey || !consumerSecret) {
      console.error('WordPress API Service: Consumer key or secret is missing. API calls may fail.');
    }

    // Create axios instance with base configuration
    this.api = axios.create({
      baseURL: `${cleanWordpressUrl}/wp-json/wc/v3/`,
    });

    this.wordpressUrl = cleanWordpressUrl;
    this.jwtEndpoint = `${cleanWordpressUrl}/wp-json/jwt-auth/v1/token`;
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;
    this.sessionToken = sessionToken;
    this.isUserLoggedIn = !!sessionToken;

    // Axios interceptor for authentication
    this.api.interceptors.request.use(
      async (config) => {
        // Initialize headers if not present
        if (!config.headers) {
          config.headers = {} as any;
        }

        // WooCommerce REST API ONLY accepts Basic Auth with consumer key/secret
        // NEVER send JWT tokens to WooCommerce endpoints - they will be rejected with 403
        const authString = `${this.consumerKey}:${this.consumerSecret}`;
        const base64Auth = this.toBase64(authString);
        config.headers.Authorization = `Basic ${base64Auth}`;

        console.log('API Request:', {
          url: `${config.baseURL}${config.url}`,
          method: config.method,
          hasAuth: !!config.headers.Authorization,
          authType: 'Basic (Consumer Key/Secret) - WooCommerce'
        });

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );
  }
}
```

### Product Management

The service provides comprehensive product management capabilities:

```typescript
// Products
async getProducts(params?: Record<string, any>) {
  try {
    const defaultParams = {
      per_page: 20, // Reduced from 100 for faster initial load
      ...params
    };

    const response = await this.api.get('/products', { params: defaultParams });

    // Return just the requested page
    // The calling component can implement pagination if needed
    return response.data;
  } catch (error: any) {
    console.error('Error fetching products:', error.response?.data || error.message);
    throw error;
  }
}

async getProduct(product_id: number) {
  try {
    const response = await this.api.get(`/products/${product_id}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error fetching product ${product_id}:`, error.response?.data || error.message);
    throw error;
  }
}

async searchProducts(search: string, page?: number, limit?: number) {
  const params: Record<string, any> = { search };
  if (page) params.page = page;
  if (limit) params.per_page = limit;

  try {
    const response = await this.api.get('/products', { params });
    // Transform WooCommerce products to app format
    const { transformProducts } = require('../utils/woocommerceTransformers');
    return transformProducts(response.data);
  } catch (error: any) {
    console.error('Error searching products:', error.response?.data || error.message);
    throw error;
  }
}
```

### Category Management

The service handles category operations as well:

```typescript
// Categories
async getCategories(params: any = {}) {
  try {
    const response = await this.api.get('/products/categories', {
      params: {
        per_page: 100,
        ...params
      }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching categories:', error.response?.data || error.message);
    throw error;
  }
}

async getProductsByCategory(categoryIdOrSlug: string, limit: number = 20) {
  try {
    let categoryId: number;

    // Check if the input is numeric (ID) or string (slug)
    const numericId = parseInt(categoryIdOrSlug);
    if (!isNaN(numericId)) {
      // It's an ID, use directly
      categoryId = numericId;
    } else {
      // It's a slug, need to get the ID first
      const categories = await this.getCategories({ slug: categoryIdOrSlug });

      if (!categories || categories.length === 0) {
        console.warn(`Category with slug "${categoryIdOrSlug}" not found`);
        return [];
      }

      categoryId = categories[0].id;
    }

    // Fetch products for this category using the WooCommerce API
    const response = await this.api.get('/products', {
      params: {
        category: categoryId,
        per_page: limit,
        orderby: 'date',
        order: 'desc'
      }
    });

    return response.data;
  } catch (error: any) {
    console.error(`Error fetching products for category "${categoryIdOrSlug}":`, error.response?.data || error.message);
    throw error;
  }
}
```

### Customer Authentication

The service handles both JWT authentication and WooCommerce customer management:

```typescript
// Authentication methods
async login(email: string, password: string) {
  try {
    // Authenticate using JWT plugin
    const response = await axios.post(this.jwtEndpoint, {
      username: email,
      password: password
    });

    if (response.data && response.data.token) {
      const token = response.data.token;

      // CRITICAL: Set token FIRST so axios interceptor can use it
      this.sessionToken = token;
      this.isUserLoggedIn = true;

      // Store the token in AsyncStorage
      await AsyncStorage.setItem('sessionToken', token);

      // Now get customer info with the token properly set
      const customer = await this.getCustomerByEmail(email);
      if (customer && customer.id) {
        await AsyncStorage.setItem('customerId', customer.id.toString());
        console.log('Customer ID stored:', customer.id);
      } else {
        console.warn('Customer not found for email:', email);
      }

      return {
        token: token,
        success: true,
        user: response.data.user_email,
        displayName: response.data.user_display_name,
        customerId: customer?.id
      };
    } else {
      throw new Error('Invalid response from authentication server');
    }
  } catch (error: any) {
    console.error('Login error:', error.response?.data || error.message);

    // Format error message for better user experience
    const errorMessage = error.response?.data?.message || error.message || 'Login failed';
    const errorCode = error.response?.data?.code || 'login_error';

    throw {
      code: errorCode,
      message: errorMessage,
      data: error.response?.data
    };
  }
}
```

### Registration Implementation

```typescript
async register(firstname: string, lastname: string, email: string, telephone: string, password: string) {
  try {
    const newCustomer: any = {
      email: email,
      first_name: firstname,
      last_name: lastname,
      username: email.split('@')[0],
      password: password,
      billing: {
        first_name: firstname,
        last_name: lastname,
        company: '',
        email: email,
        phone: telephone,
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: ''
      },
      shipping: {
        first_name: firstname,
        last_name: lastname,
        company: '',
        address_1: '',
        address_2: '',
        city: '',
        state: '',
        postcode: '',
        country: ''
      }
    };

    const response = await this.handleRequest('/customers', {
      method: 'post',
      data: newCustomer
    });

    // Store customer ID after registration
    if (response.id) {
      await AsyncStorage.setItem('customerId', response.id.toString());
    }

    // Login after registration using JWT
    const loginResponse = await this.login(email, password);

    return {
      ...response,
      token: loginResponse.token
    };
  } catch (error: any) {
    console.error('Registration error:', error.response?.data || error.message);

    // Format error message for better user experience
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message || 'Registration failed';
    const errorCode = errorData?.code || 'registration_error';

    throw {
      code: errorCode,
      message: errorMessage,
      data: errorData
    };
  }
}
```

### WooCommerce Transformers

The application includes utility functions to transform WooCommerce API responses to app formats:

```typescript
export interface AppProduct {
    id: number;
    title: string;
    image: string;
    price: number;
    original_price: number;
    description: string;
    category: string;
    category_id?: number;
    categories?: Array<{ id: number; name: string; slug: string }>; // Full categories array from WooCommerce
    rating?: {
        rate: number;
        count: number;
    };
}

/**
 * Transform WooCommerce product to app format
 */
export function transformProduct(wcProduct: any): AppProduct {
    // Extract and validate image URL
    let imageUrl = '';
    if (wcProduct.images && wcProduct.images[0]) {
        imageUrl = wcProduct.images[0].src || wcProduct.images[0];
    } else if (wcProduct.image) {
        imageUrl = typeof wcProduct.image === 'string' ? wcProduct.image : (wcProduct.image.src || '');
    }

    // Ensure image URL is properly formatted
    if (imageUrl && !imageUrl.startsWith('http')) {
        // If it's a relative URL, prepend the store URL
        // Use WORDPRESS_URL as that's what's configured in the .env
        const storeUrl = process.env.EXPO_PUBLIC_WORDPRESS_URL || '';
        if (storeUrl && !imageUrl.startsWith('/')) {
            imageUrl = `${storeUrl}/${imageUrl}`;
        }
    }

    return {
        id: wcProduct.id,
        title: decodeHtmlEntities(wcProduct.name || wcProduct.title || 'Untitled Product'),
        image: imageUrl,
        price: parseFloat(wcProduct.price || '0'),
        original_price: parseFloat(wcProduct.regular_price || wcProduct.price || '0'),
        description: decodeHtmlEntities(wcProduct.description || wcProduct.short_description || ''),
        category: wcProduct.categories && wcProduct.categories.length > 0
            ? decodeHtmlEntities(wcProduct.categories[0].name || wcProduct.categories[0].slug || 'General')
            : 'General',
        category_id: wcProduct.categories && wcProduct.categories.length > 0
            ? wcProduct.categories[0].id
            : undefined,
        // Preserve full categories array for proper filtering
        categories: wcProduct.categories && Array.isArray(wcProduct.categories)
            ? wcProduct.categories.map((cat: any) => ({
                id: cat.id,
                name: decodeHtmlEntities(cat.name),
                slug: cat.slug
            }))
            : undefined,
        rating: wcProduct.average_rating ? {
            rate: parseFloat(wcProduct.average_rating),
            count: wcProduct.rating_count || 0
        } : undefined
    };
}

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
    if (!text) return '';
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();
}
```

## Authentication Context Integration

The authentication system is managed through React Context, which selects the appropriate service based on configuration:

```typescript
const apiService: ApiService = useMemo(() => {
  if (API_SERVICE_TYPE === 'wordpress') {
    return new WordPressApiService(
      WORDPRESS_CONFIG.url,
      WORDPRESS_CONFIG.consumerKey,
      WORDPRESS_CONFIG.consumerSecret,
      sessionToken
    );
  } else {
    return new DummyApiService(sessionToken);
  }
}, [sessionToken]);
```

The AuthContext handles automatic session loading on app startup:

```typescript
useEffect(() => {
  const loadSession = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('sessionToken');
      if (storedToken) {
        // Validate token if service supports it
        if (apiService.validateToken) {
          const isValid = await apiService.validateToken(storedToken);
          if (isValid) {
            setSessionToken(storedToken);
            setIsAuthenticated(true);

            // Fetch user details
            try {
              const customerId = await AsyncStorage.getItem('customerId');
              if (customerId) {
                if (apiService.getAccountDetails) {
                  const userDetails = await apiService.getAccountDetails();
                  setUser(userDetails);
                }
              }
            } catch (userError) {
              console.error("Error fetching user details:", userError);
            }
          } else {
            // Token invalid, clear it
            console.log('Stored token is invalid, clearing session');
            await AsyncStorage.removeItem('sessionToken');
            await AsyncStorage.removeItem('customerId');
            setSessionToken(null);
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          // Fallback for services without validation (e.g. dummy)
          setSessionToken(storedToken);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error("Failed to load session token:", error);
    } finally {
      setLoadingAuth(false);
    }
  };
  loadSession();
}, [apiService]);
```

## Cart and Checkout Implementation

The cart functionality uses AsyncStorage to store items locally:

```typescript
// Shopping Cart (using draft orders in WooCommerce)
async getCartContents() {
  try {
    // For now, we use AsyncStorage for BOTH guests and logged-in users to ensure immediate functionality
    const cartItems = await AsyncStorage.getItem('cartItems');
    const items = cartItems ? JSON.parse(cartItems) : [];

    return {
      success: true,
      products: items,
      cartTotal: items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    };
  } catch (error) {
    console.error('Error getting cart contents:', error);
    return {
      success: false,
      products: [],
      cartTotal: 0
    };
  }
}

async addToCart(product_id: number, quantity: number = 1, productData?: any) {
  try {
    // Use AsyncStorage for ALL users for now
    const cartItems = await AsyncStorage.getItem('cartItems');
    let items = cartItems ? JSON.parse(cartItems) : [];

    // Check if product already exists in cart
    const existingItemIndex = items.findIndex((item: any) => item.productId === product_id);

    if (existingItemIndex >= 0) {
      items[existingItemIndex].quantity += quantity;
    } else {
      // OPTIMIZED: Use provided product data if available, otherwise fetch
      let product = productData;
      if (!product) {
        product = await this.getProduct(product_id);
      }

      const cartItem = {
        key: `cart_${product_id}_${Date.now()}`,
        productId: product.id,
        id: product.id,
        title: product.name || product.title,
        image: product.images && product.images[0] ? product.images[0].src : (product.image || ''),
        price: parseFloat(product.price || '0'),
        quantity: quantity
      };
      items.push(cartItem);
    }

    await AsyncStorage.setItem('cartItems', JSON.stringify(items));

    return {
      success: true,
      message: "Product added to cart",
      cart: items
    };
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}
```

Order creation is implemented as follows:

```typescript
async createOrder(orderData: any) {
  try {
    // Get customer ID if logged in
    const customerId = await AsyncStorage.getItem('customerId');

    // Create an order in WooCommerce
    const order: any = {
      payment_method: orderData.payment_method,
      payment_method_title: orderData.payment_method_title || 'Direct Bank Transfer',
      set_paid: orderData.set_paid || false,
      billing: orderData.billing,
      shipping: orderData.shipping,
      line_items: orderData.line_items,
      shipping_lines: orderData.shipping_lines || [
        {
          method_id: 'flat_rate',
          method_title: orderData.shipping_method || 'Flat Rate',
          total: orderData.shipping_cost || '0.00'
        }
      ]
    };

    if (customerId) {
      order.customer_id = parseInt(customerId);
    }

    const response = await this.handleRequest('/orders', {
      method: 'post',
      data: order
    });

    // Clear cart after successful order
    await AsyncStorage.removeItem('cartItems');

    return {
      success: true,
      order: response
    };
  } catch (error: any) {
    console.error('Error creating order:', error.response?.data || error.message);
    throw error;
  }
}
```

## Payment and Shipping Integration

The service fetches available payment and shipping methods from WooCommerce:

```typescript
async getPaymentMethods() {
  try {
    // Fetch payment gateways from WooCommerce
    const response = await this.handleRequest('/payment_gateways');

    // Filter to only enabled payment methods and format response
    const enabledMethods = response.filter((method: any) => method.enabled === true);

    return enabledMethods.map((method: any) => ({
      id: method.id,
      title: method.title,
      description: method.description,
      instructions: method.settings?.instructions?.value || '',
      enabled: method.enabled,
      method_title: method.method_title || method.title
    }));
  } catch (error) {
    console.error('Error getting payment methods:', error);
    // Return empty array on error - checkout will handle gracefully
    return [];
  }
}

async getShippingMethods() {
  try {
    // Fetch shipping zones from WooCommerce
    const zones = await this.handleRequest('/shipping/zones');

    // Fetch methods for each zone in parallel
    const methodsPromises = zones.map(async (zone: any) => {
      try {
        const methods = await this.handleRequest(`/shipping/zones/${zone.id}/methods`);
        // Add zone info to each method
        return methods.map((method: any) => ({
          id: method.id,
          instance_id: method.instance_id,
          title: method.title,
          method_id: method.method_id,
          method_title: method.method_title,
          enabled: method.enabled,
          settings: method.settings,
          zone_name: zone.name
        }));
      } catch (error) {
        console.error(`Error fetching methods for zone ${zone.id}:`, error);
        return [];
      }
    });

    const results = await Promise.all(methodsPromises);
    const allMethods = results.flat();

    // Filter to only enabled methods
    return allMethods.filter((method: any) => method.enabled);
  } catch (error) {
    console.error('Error getting shipping methods:', error);
    return [];
  }
}
```

## Development and Testing Support

The application includes a dummy API service that provides mock data for development:

```typescript
class DummyApiService {
  sessionToken: string | null;
  private isUserLoggedIn: boolean;

  constructor(sessionToken: string | null = null) {
    this.sessionToken = sessionToken;
    this.isUserLoggedIn = !!sessionToken;
  }

  // Products
  async getProducts(params?: Record<string, any>) {
    let filteredProducts = [...dummyElectronicsProducts];

    if (params && params.limit) {
      filteredProducts = filteredProducts.slice(0, params.limit);
    }

    return filteredProducts;
  }

  async getProduct(product_id: number) {
    return dummyElectronicsProducts.find(product => product.id === product_id) ||
      { error: "Product not found" };
  }

  async searchProducts(search: string, page?: number, limit?: number) {
    const filteredProducts = dummyElectronicsProducts.filter(product =>
      product.title.toLowerCase().includes(search.toLowerCase()) ||
      product.description.toLowerCase().includes(search.toLowerCase())
    );

    return filteredProducts.slice(0, limit || filteredProducts.length);
  }
  
  // ... other methods with mock implementations
}
```

## Security Features

The implementation includes several security measures:

1. **Authentication Validation**: Tokens are validated on startup to ensure they're still valid
2. **Secure Credential Storage**: API credentials are stored in the app configuration, not in the source code
3. **Proper Authentication Headers**: Uses Basic Authentication with consumer key/secret for WooCommerce API calls
4. **JWT Authentication**: Implements JWT for user session management
5. **Input Sanitization**: Includes HTML entity decoding to prevent XSS issues

## Error Handling

The service includes comprehensive error handling with detailed logging:

```typescript
private async handleRequest<T>(endpoint: string, options: any = {}) {
  try {
    const response = await this.api(endpoint, options);
    return response.data;
  } catch (error: any) {
    // Enhanced error logging for 403 errors
    if (error.response?.status === 403) {
      console.error(`403 Forbidden error for ${endpoint}:`, {
        endpoint,
        hasToken: !!this.sessionToken,
        tokenPreview: this.sessionToken ? `${this.sessionToken.substring(0, 20)}...` : 'none',
        errorData: error.response?.data,
        errorMessage: error.message
      });
    } else {
      console.error(`Error making request to ${endpoint}:`, error.response?.data || error.message);
    }
    throw error;
  }
}
```

## Overall Architecture

The WooCommerce integration follows a modular architecture:

1. **Configuration Layer**: Manages environment variables and API service selection
2. **Service Layer**: Handles all API communication with WooCommerce
3. **Context Layer**: Manages application state and authentication
4. **Transformation Layer**: Converts WooCommerce API responses to app-compatible formats
5. **Storage Layer**: Uses AsyncStorage for local data persistence

This architecture provides scalability and maintainability while allowing for easy switching between development and production environments.