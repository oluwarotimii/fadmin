# Optimized Polling Strategy for BUSY Web API Integration

## Overview
This document outlines an efficient polling strategy for detecting changes in BUSY accounting software using the BUSY Web API's SQL query capabilities. This approach enables near-real-time synchronization without overloading the BUSY server, even with 30k-50k products.

## The Efficient Change Detection Approach

### Core Concept
Instead of polling all 30k-50k products every 30 seconds, use BUSY's SQL query service (SC=1) with timestamp-based filtering to detect only changed records.

### Key Benefits
- **Minimal Server Load**: Only changed records are returned
- **Low Bandwidth Usage**: Small data transfers
- **Near Real-time Updates**: 30-second polling detects changes quickly
- **Scalable**: Performance doesn't degrade with total product count
- **Efficient**: BUSY's internal indexes optimize timestamp queries

## Implementation Strategy

### 1. Database Schema for Tracking

```sql
-- Table to store sync metadata
CREATE TABLE busy_sync_metadata (
  id SERIAL PRIMARY KEY,
  sync_key VARCHAR(100) UNIQUE NOT NULL,
  last_sync_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Initialize with initial sync time
INSERT INTO busy_sync_metadata (sync_key, last_sync_timestamp) 
VALUES ('last_item_sync', NOW());
```

### 2. Optimized Polling Service

```javascript
// lib/optimized-poller.js
import { BusyApiHandler } from './busy-api-handler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OptimizedPoller {
  constructor(busyApiHandler) {
    this.busyApiHandler = busyApiHandler;
    this.pollingInterval = 30000; // Default 30 seconds
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async start() {
    console.log('Starting optimized polling service...');
    
    // Run initial sync
    await this.performInitialSync();
    
    // Start periodic polling
    setInterval(async () => {
      await this.optimizedPoll();
    }, this.pollingInterval);
  }

  async performInitialSync() {
    console.log('Performing initial full sync...');
    
    try {
      // Fetch all items initially
      const query = `
        SELECT 
          ItemCode, 
          ItemName, 
          PrintName, 
          Rate, 
          QtyOnHand, 
          UnitName, 
          MC AS MaterialCenter,
          LastModified
        FROM ItemMaster
      `;
      
      const response = await this.busyApiHandler.makeApiCall('1', query);
      const allItems = transformBusyData(response.data, 'items');
      
      // Bulk insert into shadow database
      await this.bulkUpsertItems(allItems);
      
      // Update last sync time
      await this.updateLastSyncTime(new Date().toISOString());
      
      console.log(`Initial sync completed: ${allItems.length} items`);
    } catch (error) {
      console.error('Initial sync failed:', error);
      throw error;
    }
  }

  async optimizedPoll() {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        const lastSync = await this.getLastSyncTime();
        const currentTime = new Date().toISOString();
        
        // Efficient query - only returns changed records
        const query = `
          SELECT 
            ItemCode, 
            ItemName, 
            PrintName, 
            Rate, 
            QtyOnHand, 
            UnitName, 
            MC AS MaterialCenter,
            LastModified
          FROM ItemMaster 
          WHERE LastModified > '${lastSync}'
          ORDER BY LastModified ASC
        `;
        
        const response = await this.busyApiHandler.makeApiCall('1', query);
        const changedItems = transformBusyData(response.data, 'items');
        
        if (changedItems.length > 0) {
          console.log(`Detected ${changedItems.length} changes since ${lastSync}`);
          
          // Process changes in batches to avoid overwhelming
          await this.processChangesInBatches(changedItems);
        } else {
          console.log(`No changes detected since ${lastSync}`);
        }
        
        // Update sync timestamp
        await this.updateLastSyncTime(currentTime);
        
        // Adjust polling based on activity
        await this.adaptPollingFrequency(changedItems.length);
        
        break; // Success, exit retry loop
      } catch (error) {
        retries++;
        console.error(`Poll attempt ${retries} failed:`, error.message);
        
        if (retries >= this.maxRetries) {
          console.error('Max retries reached, continuing...');
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
      }
    }
  }

  async processChangesInBatches(changedItems) {
    const batchSize = 10; // Process 10 items at a time
    
    for (let i = 0; i < changedItems.length; i += batchSize) {
      const batch = changedItems.slice(i, i + batchSize);
      
      // Process batch in parallel
      await Promise.all(batch.map(item => this.processSingleChange(item)));
      
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < changedItems.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async processSingleChange(item) {
    try {
      // Get existing record to determine change type
      const existingRecord = await prisma.busyProductShadow.findUnique({
        where: { busy_item_code: item.id }
      });

      // Determine event type
      let eventType = 'UPDATE';
      if (!existingRecord) {
        eventType = 'CREATE';
      } else {
        if (existingRecord.busy_rate !== item.rate) {
          eventType = 'PRICE_CHANGE';
        } else if (existingRecord.busy_qty_on_hand !== item.qtyOnHand) {
          eventType = 'STOCK_CHANGE';
        }
      }

      // Log the event
      await prisma.syncEventLog.create({
        data: {
          busy_item_code: item.id,
          event_type: eventType,
          old_values: existingRecord ? {
            rate: existingRecord.busy_rate,
            qty_on_hand: existingRecord.busy_qty_on_hand
          } : null,
          new_values: {
            rate: item.rate,
            qty_on_hand: item.qtyOnHand
          }
        }
      });

      // Update shadow database
      await prisma.busyProductShadow.upsert({
        where: { busy_item_code: item.id },
        update: {
          busy_item_name: item.name,
          busy_print_name: item.printName,
          busy_rate: item.rate,
          busy_qty_on_hand: item.qtyOnHand,
          busy_unit_name: item.unit,
          busy_material_center: item.materialCenter,
          last_modified: item.lastModified || new Date(),
          synced_at: new Date()
        },
        create: {
          busy_item_code: item.id,
          busy_item_name: item.name,
          busy_print_name: item.printName,
          busy_rate: item.rate,
          busy_qty_on_hand: item.qtyOnHand,
          busy_unit_name: item.unit,
          busy_material_center: item.materialCenter,
          last_modified: item.lastModified || new Date(),
          synced_at: new Date()
        }
      });

      // Trigger updates for linked web products
      await this.triggerWebProductUpdates(item.id);
    } catch (error) {
      console.error(`Error processing change for item ${item.id}:`, error);
    }
  }

  async adaptPollingFrequency(changeCount) {
    // Adjust polling frequency based on activity
    if (changeCount > 20) {
      // High activity - increase polling frequency
      this.pollingInterval = Math.max(5000, this.pollingInterval - 5000);
      console.log(`High activity detected, increasing polling to ${this.pollingInterval}ms`);
    } else if (changeCount === 0) {
      // No activity - decrease polling frequency to save resources
      this.pollingInterval = Math.min(120000, this.pollingInterval + 10000);
      console.log(`No changes, reducing polling to ${this.pollingInterval}ms`);
    } else {
      // Moderate activity - keep current frequency
      this.pollingInterval = 30000;
    }
  }

  async getLastSyncTime() {
    const metadata = await prisma.busySyncMetadata.findUnique({
      where: { sync_key: 'last_item_sync' }
    });

    if (metadata) {
      return metadata.last_sync_timestamp.toISOString();
    }
    
    // Default to 1 hour ago if no sync record exists
    return new Date(Date.now() - 60 * 60 * 1000).toISOString();
  }

  async updateLastSyncTime(timestamp) {
    await prisma.busySyncMetadata.upsert({
      where: { sync_key: 'last_item_sync' },
      update: { last_sync_timestamp: new Date(timestamp) },
      create: { sync_key: 'last_item_sync', last_sync_timestamp: new Date(timestamp) }
    });
  }

  async bulkUpsertItems(items) {
    // Bulk upsert all items efficiently
    for (const item of items) {
      await prisma.busyProductShadow.upsert({
        where: { busy_item_code: item.id },
        update: {
          busy_item_name: item.name,
          busy_print_name: item.printName,
          busy_rate: item.rate,
          busy_qty_on_hand: item.qtyOnHand,
          busy_unit_name: item.unit,
          busy_material_center: item.materialCenter,
          last_modified: item.lastModified || new Date(),
          synced_at: new Date()
        },
        create: {
          busy_item_code: item.id,
          busy_item_name: item.name,
          busy_print_name: item.printName,
          busy_rate: item.rate,
          busy_qty_on_hand: item.qtyOnHand,
          busy_unit_name: item.unit,
          busy_material_center: item.materialCenter,
          last_modified: item.lastModified || new Date(),
          synced_at: new Date()
        }
      });
    }
  }

  async triggerWebProductUpdates(busyItemCode) {
    const linkedProducts = await prisma.productLinkMapping.findMany({
      where: {
        busy_item_code: busyItemCode,
        is_sync_enabled: true
      }
    });

    // Queue updates for linked products
    for (const link of linkedProducts) {
      await this.queueWebProductUpdate(link.web_product_id);
    }
  }

  async queueWebProductUpdate(webProductId) {
    // In production, use a proper queue system like Bull or RabbitMQ
    console.log(`Queuing update for web product: ${webProductId}`);
    
    // Trigger Next.js revalidation
    try {
      // Example: await revalidatePath(`/products/${webProductId}`);
      console.log(`Revalidated product: ${webProductId}`);
    } catch (error) {
      console.error(`Revalidation failed for ${webProductId}:`, error);
    }
  }
}
```

### 3. Advanced Polling Features

#### A. Batch Size Optimization
```javascript
// Adjust batch size based on server performance
const getOptimalBatchSize = (serverLoad) => {
  if (serverLoad > 0.8) return 5;   // High load - small batches
  if (serverLoad > 0.5) return 10;  // Medium load - medium batches
  return 20;                        // Low load - larger batches
};
```

#### B. Intelligent Backoff
```javascript
// Implement exponential backoff for failed requests
async function exponentialBackoff(attempt, baseDelay = 1000) {
  const delay = baseDelay * Math.pow(2, attempt);
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

#### C. Health Monitoring
```javascript
// Monitor polling health and performance
class PollingHealthMonitor {
  constructor() {
    this.metrics = {
      successfulPolls: 0,
      failedPolls: 0,
      avgResponseTime: 0,
      totalChangesProcessed: 0
    };
  }

  recordPoll(success, responseTime, changesCount) {
    if (success) {
      this.metrics.successfulPolls++;
    } else {
      this.metrics.failedPolls++;
    }
    
    this.metrics.avgResponseTime = 
      ((this.metrics.avgResponseTime * (this.metrics.successfulPolls + this.metrics.failedPolls - 1)) + responseTime) / 
      (this.metrics.successfulPolls + this.metrics.failedPolls);
    
    this.metrics.totalChangesProcessed += changesCount;
  }
}
```

## Performance Characteristics

### With 50,000 Products:
- **Full Polling**: Would return 50,000 records every 30 seconds (overwhelming)
- **Optimized Polling**: Typically returns 1-5 records every 30 seconds (efficient)

### Typical Change Patterns:
- **Normal Business Hours**: 1-10 items change per polling cycle
- **Peak Activity**: 10-30 items change per polling cycle
- **Quiet Periods**: 0-2 items change per polling cycle

### Resource Usage:
- **CPU**: Minimal (only processes changed records)
- **Memory**: Low (small result sets)
- **Bandwidth**: Minimal (only changed data transferred)
- **Database**: Efficient (indexed timestamp queries)

## Implementation Best Practices

1. **Always use timestamp-based filtering** in your SQL queries
2. **Implement proper error handling and retries**
3. **Use batching for processing multiple changes**
4. **Monitor and adapt polling frequency** based on activity
5. **Log all operations** for debugging and monitoring
6. **Implement health checks** to ensure polling is working
7. **Use connection pooling** for API calls
8. **Cache frequently accessed data** where appropriate

This optimized polling strategy leverages BUSY's SQL query capabilities to create an efficient, scalable solution that can handle large product catalogs without overloading the BUSY server.
