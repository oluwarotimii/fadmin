// lib/woocommerce.ts
// Service to handle WooCommerce API operations efficiently
import { getCache, setCache } from './cache';

interface WooCommerceProduct {
  id?: number;
  name: string;
  slug?: string;
  type?: string;
  status?: 'draft' | 'publish';
  sku: string;
  description?: string;
  short_description?: string;
  price?: string;
  regular_price?: string;
  stock_quantity?: number;
  manage_stock?: boolean;
  images?: Array<{
    id?: number;
    src?: string;
  }>;
}

export interface BusyProductData {
  ItemId: string;
  ItemName: string;
  PrintName: string;
  SalePrice: number;
  TotalAvailableStock: number;
  Category?: string;
  Description?: string;
  ImageUrl?: string;
}

class WooCommerceService {
  private baseUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private authString: string;

  constructor() {
    if (!process.env.WOOCOMMERCE_URL || !process.env.WOOCOMMERCE_CONSUMER_KEY || !process.env.WOOCOMMERCE_CONSUMER_SECRET) {
      throw new Error('WooCommerce environment variables not set');
    }

    this.baseUrl = process.env.WOOCOMMERCE_URL;
    this.consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    this.consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;
    this.authString = `${this.consumerKey}:${this.consumerSecret}`;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}/wp-json/wc/v3/${endpoint}`;
    const authHeader = 'Basic ' + Buffer.from(this.authString).toString('base64');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WooCommerce API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return await response.json();
  }

  // Get product by SKU to check if it exists
  async getProductBySKU(sku: string): Promise<WooCommerceProduct | null> {
    try {
      // Try to get from cache first
      const cachedProduct = getCache(`product_sku_${sku}`);
      if (cachedProduct) {
        return cachedProduct;
      }

      const products = await this.makeRequest(
        `products?sku=${encodeURIComponent(sku)}&per_page=1`,
        { method: 'GET' }
      );

      const product = products.length > 0 ? products[0] : null;

      // Cache the result for 5 minutes (300 seconds)
      if (product) {
        setCache(`product_sku_${sku}`, product, 300);
      }

      return product;
    } catch (error) {
      console.error(`Error fetching product by SKU ${sku}:`, error);
      return null;
    }
  }

  // Update existing product
  async updateProduct(productId: number, productData: Partial<WooCommerceProduct>): Promise<WooCommerceProduct> {
    return await this.makeRequest(`products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    });
  }

  // Create new product
  async createProduct(productData: WooCommerceProduct): Promise<WooCommerceProduct> {
    // Set default status to draft for new products from Busy
    const productWithDraftStatus = {
      ...productData,
      status: 'draft' as const
    };
    
    return await this.makeRequest('products', {
      method: 'POST',
      body: JSON.stringify(productWithDraftStatus),
    });
  }

  // Batch update multiple products efficiently
  async batchUpdateProducts(products: Array<{ id: number; changes: Partial<WooCommerceProduct> }>) {
    if (products.length === 0) return [];

    // Group product updates by common changes to reduce API calls
    const updates = products.map(p => ({
      id: p.id,
      ...p.changes
    }));

    // WooCommerce supports batch operations
    const result = await this.makeRequest('products/batch', {
      method: 'POST',
      body: JSON.stringify({ update: updates }),
    });

    return result;
  }

  // Batch create multiple products efficiently
  async batchCreateProducts(products: WooCommerceProduct[]) {
    if (products.length === 0) return [];

    // Set all new products to draft status by default
    const productsWithDraftStatus = products.map(product => ({
      ...product,
      status: 'draft' as const
    }));

    const result = await this.makeRequest('products/batch', {
      method: 'POST',
      body: JSON.stringify({ create: productsWithDraftStatus }),
    });

    return result;
  }

  // Get multiple products by SKUs efficiently
  async getProductsBySKUs(skus: string[]): Promise<WooCommerceProduct[]> {
    if (skus.length === 0) return [];

    // Create a cache key based on all SKUs
    const cacheKey = `products_skus_${skus.sort().join('_')}`;

    // Try to get from cache first
    const cachedProducts = getCache(cacheKey);
    if (cachedProducts) {
      return cachedProducts;
    }

    // WooCommerce supports filtering by multiple SKUs using comma-separated values
    const skuFilter = skus.join(',');
    const products = await this.makeRequest(
      `products?sku=${encodeURIComponent(skuFilter)}&per_page=100`,
      { method: 'GET' }
    );

    // Cache the result for 5 minutes (300 seconds)
    setCache(cacheKey, products, 300);

    return products;
  }
}

export default WooCommerceService;