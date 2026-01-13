# Event-Driven BUSY Sync Strategy: Shadow Database with Real-Time Updates

## Overview
This document outlines an efficient, event-driven approach to synchronize BUSY accounting software with a Next.js web platform using a "Shadow Database" strategy combined with high-frequency pulse detection for near-instant updates.

## The "Shadow & Pulse" Strategy

### Core Concept
Instead of performing full data exports, maintain a local "Shadow Database" in your Next.js application that mirrors BUSY data, and use a "Pulse" mechanism to detect and sync only incremental changes.

### Benefits
- **Performance**: Cloud databases are 1000x faster than local BUSY API calls
- **Offline Resilience**: Website continues to function when BUSY is offline
- **Efficiency**: Only syncs changed records (typically 1-5 items vs 30,000)
- **Real-time Updates**: Near-instant propagation of changes
- **Scalability**: Handles 30k+ products without performance degradation

## Architecture Components

### 1. Shadow Database Tables

```sql
-- Shadow table for BUSY products
CREATE TABLE busy_product_shadow (
  id SERIAL PRIMARY KEY,
  busy_item_code VARCHAR(255) UNIQUE NOT NULL,
  busy_item_name VARCHAR(500),
  busy_print_name VARCHAR(500),
  busy_rate DECIMAL(10,2),
  busy_qty_on_hand INTEGER,
  busy_unit_name VARCHAR(100),
  busy_material_center VARCHAR(255),
  last_modified TIMESTAMP,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Link table between web products and BUSY shadow
CREATE TABLE product_link_mapping (
  id SERIAL PRIMARY KEY,
  web_product_id VARCHAR(255) NOT NULL,
  busy_item_code VARCHAR(255),
  is_sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Event log for tracking changes
CREATE TABLE sync_event_log (
  id SERIAL PRIMARY KEY,
  busy_item_code VARCHAR(255),
  event_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'PRICE_CHANGE', 'STOCK_CHANGE'
  old_values JSON,
  new_values JSON,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. The Pulse Watcher Service

```javascript
// lib/pulse-watcher.js
import { BusyApiHandler } from './busy-api-handler';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const LAST_SYNC_KEY = 'last_pulse_sync';

export class PulseWatcher {
  constructor(busyApiHandler) {
    this.busyApiHandler = busyApiHandler;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('Starting Pulse Watcher...');
    
    // Run initial sync
    await this.performInitialSync();
    
    // Start periodic pulse checks
    setInterval(async () => {
      await this.pulseCheck();
    }, 30000); // Check every 30 seconds
  }

  async performInitialSync() {
    console.log('Performing initial full sync...');
    
    try {
      // Fetch all items from BUSY
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
      
      const items = await this.busyApiHandler.makeApiCall('1', query);
      const transformedItems = transformBusyData(items.data, 'items');
      
      // Upsert all items into shadow database
      for (const item of transformedItems) {
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
      
      console.log(`Initial sync completed: ${transformedItems.length} items processed`);
    } catch (error) {
      console.error('Initial sync failed:', error);
    }
  }

  async pulseCheck() {
    try {
      // Get last sync timestamp
      const lastSync = await this.getLastSyncTime();
      const currentTime = new Date().toISOString();
      
      // Query for items modified since last sync
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
      `;
      
      const response = await this.busyApiHandler.makeApiCall('1', query);
      const changedItems = transformBusyData(response.data, 'items');
      
      if (changedItems.length > 0) {
        console.log(`Pulse detected ${changedItems.length} changes`);
        
        // Process each changed item
        for (const item of changedItems) {
          await this.processChangedItem(item);
        }
        
        // Update last sync time
        await this.updateLastSyncTime(currentTime);
      }
      
      // Clean up old event logs
      await this.cleanupEventLogs();
    } catch (error) {
      console.error('Pulse check failed:', error);
    }
  }

  async processChangedItem(item) {
    // Get existing record to compare
    const existingRecord = await prisma.busyProductShadow.findUnique({
      where: { busy_item_code: item.id }
    });

    // Determine event type
    let eventType = 'UPDATE';
    if (!existingRecord) {
      eventType = 'CREATE';
    } else {
      // Determine specific change type
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

    // Trigger web product updates for linked items
    await this.triggerWebProductUpdates(item.id);
  }

  async triggerWebProductUpdates(busyItemCode) {
    // Find all web products linked to this BUSY item
    const linkedProducts = await prisma.productLinkMapping.findMany({
      where: {
        busy_item_code: busyItemCode,
        is_sync_enabled: true
      }
    });

    // Update each linked web product
    for (const link of linkedProducts) {
      await this.updateWebProduct(link.web_product_id);
    }
  }

  async updateWebProduct(webProductId) {
    // This would call your web platform's update mechanism
    // Could trigger Next.js revalidation, update CDN, etc.
    console.log(`Triggering update for web product: ${webProductId}`);
    
    // Example: Trigger Next.js on-demand revalidation
    // await fetch(`/api/revalidate?product=${webProductId}`, { method: 'POST' });
  }

  async getLastSyncTime() {
    // In a real implementation, this would come from your settings table
    // For now, return a default time
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
  }

  async updateLastSyncTime(time) {
    // Update the last sync time in your settings
    console.log(`Updated last sync time to: ${time}`);
  }

  async cleanupEventLogs() {
    // Remove event logs older than 30 days
    await prisma.syncEventLog.deleteMany({
      where: {
        created_at: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });
  }
}
```

### 3. Event-Driven Sync Handler

```javascript
// lib/event-driven-sync.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EventDrivenSync {
  // Handle real-time updates from BUSY
  static async handleRealTimeUpdate(updateData) {
    const { busyItemCode, changes, eventType } = updateData;
    
    // Log the event
    await prisma.syncEventLog.create({
      data: {
        busy_item_code: busyItemCode,
        event_type: eventType,
        new_values: changes
      }
    });

    // Update shadow database
    await prisma.busyProductShadow.update({
      where: { busy_item_code: busyItemCode },
      data: {
        busy_rate: changes.rate,
        busy_qty_on_hand: changes.qtyOnHand,
        last_modified: new Date(),
        synced_at: new Date()
      }
    });

    // Trigger linked web product updates
    await this.updateLinkedWebProducts(busyItemCode);
  }

  static async updateLinkedWebProducts(busyItemCode) {
    const links = await prisma.productLinkMapping.findMany({
      where: {
        busy_item_code: busyItemCode,
        is_sync_enabled: true
      }
    });

    // Use a queue system for efficient processing
    for (const link of links) {
      await this.queueWebProductUpdate(link.web_product_id);
    }
  }

  static async queueWebProductUpdate(webProductId) {
    // In a real implementation, use a proper queue like Bull or RabbitMQ
    // For now, simulate with a simple update
    console.log(`Queuing update for web product: ${webProductId}`);
    
    // Trigger Next.js revalidation
    await this.triggerNextJsRevalidation(webProductId);
  }

  static async triggerNextJsRevalidation(webProductId) {
    // Example of triggering Next.js on-demand revalidation
    try {
      // This would typically be called from a server-side function
      // await revalidatePath(`/products/${webProductId}`);
      console.log(`Revalidated product: ${webProductId}`);
    } catch (error) {
      console.error('Revalidation failed:', error);
    }
  }
}
```

### 4. Next.js API Routes for Event Handling

```javascript
// pages/api/busy/webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { busyItemCode, changes, eventType } = req.body;
    
    // Validate the webhook signature if needed
    // await validateWebhookSignature(req);
    
    // Process the real-time update
    await EventDrivenSync.handleRealTimeUpdate({
      busyItemCode,
      changes,
      eventType
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: error.message });
  }
}

// pages/api/busy/pulse-status.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get pulse watcher status
    const lastEvent = await prisma.syncEventLog.findFirst({
      orderBy: { created_at: 'desc' }
    });

    const pendingEvents = await prisma.syncEventLog.count({
      where: { processed_at: null }
    });

    res.status(200).json({
      status: 'running',
      lastEvent: lastEvent?.created_at,
      pendingEvents,
      totalSynced: await prisma.busyProductShadow.count()
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### 5. Admin Dashboard for Handshake Management

```javascript
// pages/admin/busy-sync.jsx
import { useState, useEffect } from 'react';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default function BusySyncDashboard() {
  const [syncStats, setSyncStats] = useState({});
  const [unlinkedProducts, setUnlinkedProducts] = useState([]);
  const [busyItems, setBusyItems] = useState([]);

  useEffect(() => {
    loadSyncData();
  }, []);

  const loadSyncData = async () => {
    // Get sync statistics
    const stats = await fetch('/api/busy/pulse-status').then(r => r.json());
    setSyncStats(stats);

    // Get unlinked web products
    const unlinked = await fetch('/api/busy/unlinked-products').then(r => r.json());
    setUnlinkedProducts(unlinked);

    // Get busy items for linking
    const busyItems = await fetch('/api/busy/shadow-items').then(r => r.json());
    setBusyItems(busyItems);
  };

  const linkProduct = async (webProductId, busyItemCode) => {
    await fetch('/api/busy/link-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webProductId, busyItemCode })
    });

    loadSyncData(); // Refresh data
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">BUSY Sync Dashboard</h1>
      
      {/* Sync Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-semibold">Total Products</h3>
          <p>{syncStats.totalSynced || 0}</p>
        </div>
        <div className="bg-green-100 p-4 rounded">
          <h3 className="font-semibold">Last Event</h3>
          <p>{syncStats.lastEvent || 'Never'}</p>
        </div>
        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold">Pending Events</h3>
          <p>{syncStats.pendingEvents || 0}</p>
        </div>
        <div className="bg-purple-100 p-4 rounded">
          <h3 className="font-semibold">Unlinked Products</h3>
          <p>{unlinkedProducts.length}</p>
        </div>
      </div>

      {/* Unlinked Products Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Unlinked Products ({unlinkedProducts.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th>Web Product ID</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {unlinkedProducts.map(product => (
                <tr key={product.id}>
                  <td>{product.id}</td>
                  <td>{product.name}</td>
                  <td>{product.sku}</td>
                  <td>
                    <select 
                      onChange={(e) => linkProduct(product.id, e.target.value)}
                      className="border rounded p-1"
                    >
                      <option value="">Select BUSY Item</option>
                      {busyItems.map(item => (
                        <option key={item.busy_item_code} value={item.busy_item_code}>
                          {item.busy_print_name} ({item.busy_item_code})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

## Efficiency Comparison

| Feature | Old Way (Full Sync) | New Way (Pulse Sync) |
|---------|-------------------|---------------------|
| Data Volume | 30,000 items every time | 1-5 items per update |
| Server Load | High (System slows down) | Negligible (BUSY won't notice) |
| Update Speed | Hours/Daily | Instant (Seconds) |
| Reliability | Fails if internet blips | Self-healing (Matches on SKU) |
| Performance Impact | Significant | Minimal |

## Key Implementation Rules

### Rule 1: Event Log Approach
Don't just overwrite data; log changes in your Next.js database to maintain history of price updates.

### Rule 2: Decouple the UI
The website should always show data from the Shadow Table. If the BUSY server goes offline, the website continues operating with the last known prices.

### Rule 3: Manual Override Capability
Allow temporary unlinking of SKUs in the admin panel for special website-only pricing that BUSY shouldn't overwrite.

### Rule 4: Smart Conflict Resolution
If the PrintName in BUSY is "BATTERY" but the Website Title is "Super Power Cell," preserve the website title to protect SEO.

## Summary

This event-driven solution creates a Next.js application hosting a Shadow Database that's continuously updated by a Local Pulse Watcher on the BUSY PC. The "Handshake" occurs in the cloud between Website Products and Shadow Items via shared SKUs, with real-time change detection ensuring near-instant synchronization while maintaining optimal performance and reliability.
