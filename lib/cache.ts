// lib/cache.ts
// Simple in-memory cache for frequently accessed data
interface CacheItem {
  value: any;
  expiry: number; // timestamp in milliseconds
}

class SimpleCache {
  private cache: Map<string, CacheItem> = new Map();

  // Set a value with an expiration time (in seconds)
  set(key: string, value: any, ttl: number = 300): void { // default 5 minutes
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiry });
  }

  // Get a value, returns undefined if expired or not found
  get(key: string): any | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  // Check if a key exists and is not expired
  has(key: string): boolean {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // Delete a key
  delete(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries (call periodically)
  clean(): void {
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new SimpleCache();

// Export cache utility functions
export const setCache = (key: string, value: any, ttl: number = 300) => cache.set(key, value, ttl);
export const getCache = (key: string) => cache.get(key);
export const hasCache = (key: string) => cache.has(key);
export const deleteCache = (key: string) => cache.delete(key);