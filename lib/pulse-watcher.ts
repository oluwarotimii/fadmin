// lib/pulse-watcher.ts
// Pulse Watcher Service for BUSY Web API integration

import BusyWebApiService from './busy-web-api';
import sql from './db';

interface LastSyncRecord {
  id: number;
  key_name: string;
  value: string;
  updated_at: string;
}

class PulseWatcher {
  private busyApiService: BusyWebApiService;
  private isRunning: boolean;
  private readonly SYNC_INTERVAL: number = 30000; // 30 seconds
  private syncIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.busyApiService = new BusyWebApiService();
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('Starting Pulse Watcher...');

    // Run initial sync
    await this.performInitialSync();

    // Start periodic pulse checks
    this.syncIntervalId = setInterval(async () => {
      await this.pulseCheck();
    }, this.SYNC_INTERVAL);
  }

  async stop() {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
    this.isRunning = false;
    console.log('Pulse Watcher stopped');
  }

  async performInitialSync() {
    console.log('Performing initial full sync...');

    try {
      // Check if we should create products that don't exist on the website during initial sync
      const createOnInitialSyncSetting = await sql`
        SELECT setting_value FROM busy_sync_settings
        WHERE setting_key = 'create_products_on_initial_sync'
      `;

      const shouldCreateOnInitialSync = createOnInitialSyncSetting.length > 0
        ? createOnInitialSyncSetting[0].setting_value === 'true'
        : false;

      // Fetch all items from BUSY
      const items = await this.busyApiService.getAllItems();

      // Upsert all items into shadow database
      for (const item of items) {
        await sql`
          INSERT INTO busy_product_shadow (
            busy_item_code,
            busy_item_name,
            busy_print_name,
            busy_rate,
            busy_qty_on_hand,
            busy_unit_name,
            busy_material_center,
            busy_last_modified,
            synced_at
          )
          VALUES (
            ${item.ItemCode},
            ${item.ItemName},
            ${item.PrintName},
            ${item.Rate},
            ${item.QtyOnHand},
            ${item.UnitName || null},
            ${item.MaterialCenter || null},
            ${item.LastModified ? new Date(item.LastModified) : null},
            NOW()
          )
          ON CONFLICT (busy_item_code)
          DO UPDATE SET
            busy_item_name = EXCLUDED.busy_item_name,
            busy_print_name = EXCLUDED.busy_print_name,
            busy_rate = EXCLUDED.busy_rate,
            busy_qty_on_hand = EXCLUDED.busy_qty_on_hand,
            busy_unit_name = EXCLUDED.busy_unit_name,
            busy_material_center = EXCLUDED.busy_material_center,
            busy_last_modified = EXCLUDED.busy_last_modified,
            synced_at = EXCLUDED.synced_at
        `;

        // If configured to create products during initial sync and product doesn't exist on website
        if (shouldCreateOnInitialSync) {
          // Check if this BUSY item already has a web product link
          const existingLink = await sql`
            SELECT web_product_id FROM product_link_mapping
            WHERE busy_item_code = ${item.ItemCode}
          `;

          if (existingLink.length === 0) {
            // This BUSY item doesn't have a web product link, create one
            await this.createWebProductForBusyItem(item);
          }
        }
      }

      console.log(`Initial sync completed: ${items.length} items processed`);
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
      const changedItems = await this.busyApiService.getUpdatedItems(new Date(lastSync));

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

  async processChangedItem(item: any) {
    // Get existing record to compare
    const existingRecord = await sql`
      SELECT * FROM busy_product_shadow WHERE busy_item_code = ${item.ItemCode}
    `;

    const existing = existingRecord.length > 0 ? existingRecord[0] : null;

    // Determine event type
    let eventType = 'UPDATE';
    if (!existing) {
      eventType = 'CREATE';
    } else {
      // Determine specific change type
      if (existing.busy_rate !== item.Rate) {
        eventType = 'PRICE_CHANGE';
      } else if (existing.busy_qty_on_hand !== item.QtyOnHand) {
        eventType = 'STOCK_CHANGE';
      }
    }

    // Log the event
    await sql`
      INSERT INTO sync_event_log (
        busy_item_code,
        event_type,
        old_values,
        new_values
      )
      VALUES (
        ${item.ItemCode},
        ${eventType},
        ${existing ? JSON.stringify({
          rate: existing.busy_rate,
          qty_on_hand: existing.busy_qty_on_hand
        }) : null},
        ${JSON.stringify({
          rate: item.Rate,
          qty_on_hand: item.QtyOnHand
        })}
      )
    `;

    // Update shadow database
    await sql`
      INSERT INTO busy_product_shadow (
        busy_item_code,
        busy_item_name,
        busy_print_name,
        busy_rate,
        busy_qty_on_hand,
        busy_unit_name,
        busy_material_center,
        busy_last_modified,
        synced_at
      )
      VALUES (
        ${item.ItemCode},
        ${item.ItemName},
        ${item.PrintName},
        ${item.Rate},
        ${item.QtyOnHand},
        ${item.UnitName || null},
        ${item.MaterialCenter || null},
        ${item.LastModified ? new Date(item.LastModified) : null},
        NOW()
      )
      ON CONFLICT (busy_item_code)
      DO UPDATE SET
        busy_item_name = EXCLUDED.busy_item_name,
        busy_print_name = EXCLUDED.busy_print_name,
        busy_rate = EXCLUDED.busy_rate,
        busy_qty_on_hand = EXCLUDED.busy_qty_on_hand,
        busy_unit_name = EXCLUDED.busy_unit_name,
        busy_material_center = EXCLUDED.busy_material_center,
        busy_last_modified = EXCLUDED.busy_last_modified,
        synced_at = EXCLUDED.synced_at
    `;

    // Check if this is a new item that doesn't have a web product link
    if (!existing) {
      // Check if auto-creation is enabled globally
      const autoCreateSetting = await sql`
        SELECT setting_value FROM busy_sync_settings
        WHERE setting_key = 'auto_create_enabled'
      `;

      const isAutoCreateEnabled = autoCreateSetting.length > 0
        ? autoCreateSetting[0].setting_value === 'true'
        : false;

      if (isAutoCreateEnabled) {
        // Create a new web product for this BUSY item
        await this.createWebProductForBusyItem(item);
      }
    }

    // Trigger web product updates for linked items
    await this.triggerWebProductUpdates(item.ItemCode);
  }

  async createWebProductForBusyItem(item: any) {
    // Initialize WooCommerce service
    let woocommerceService: any = null;
    try {
      const WooCommerceService = (await import('./woocommerce')).default;
      woocommerceService = new WooCommerceService();
    } catch (error) {
      console.error('WooCommerce service not available for product creation:', error);
      return;
    }

    if (woocommerceService) {
      try {
        // Create product in WooCommerce
        const productData = {
          name: item.PrintName || item.ItemName,
          sku: item.ItemName, // Use ItemName as SKU to match BUSY
          regular_price: item.Rate.toString(),
          stock_quantity: item.QtyOnHand,
          manage_stock: true,
          stock_status: item.QtyOnHand > 0 ? 'instock' : 'outofstock',
          status: 'draft', // Create as draft for manual review
          description: `Product created from BUSY: ${item.ItemName}`
        };

        const createdProduct = await woocommerceService.createProduct(productData);

        // Create a link between BUSY item and web product
        await sql`
          INSERT INTO product_link_mapping (
            web_product_id,
            busy_item_code,
            is_sync_enabled,
            auto_create_enabled
          )
          VALUES (
            ${createdProduct.id.toString()},
            ${item.ItemCode},
            true,
            true
          )
          ON CONFLICT (web_product_id)
          DO UPDATE SET
            busy_item_code = EXCLUDED.busy_item_code,
            is_sync_enabled = EXCLUDED.is_sync_enabled,
            auto_create_enabled = EXCLUDED.auto_create_enabled
        `;

        console.log(`Created web product for BUSY item ${item.ItemCode}: ${createdProduct.id}`);
      } catch (error) {
        console.error(`Failed to create web product for BUSY item ${item.ItemCode}:`, error);
      }
    }
  }

  async triggerWebProductUpdates(busyItemCode: string) {
    // Find all web products linked to this BUSY item
    const linkedProducts = await sql`
      SELECT web_product_id FROM product_link_mapping 
      WHERE busy_item_code = ${busyItemCode} AND is_sync_enabled = true
    `;

    // Update each linked web product
    for (const link of linkedProducts) {
      await this.updateWebProduct(link.web_product_id);
    }
  }

  async updateWebProduct(webProductId: string) {
    // This would call your web platform's update mechanism
    // For now, just log the update
    console.log(`Triggering update for web product: ${webProductId}`);
    
    // In a real implementation, this might trigger Next.js revalidation,
    // update CDN, or call other services
  }

  async getLastSyncTime(): Promise<string> {
    try {
      const result = await sql`
        SELECT value FROM last_sync_records WHERE key_name = 'busy_pulse_last_sync'
      `;
      
      if (result.length > 0) {
        return result[0].value;
      }
      
      // If no record exists, return a default time (24 hours ago)
      return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    } catch (error) {
      // If the table doesn't exist, return default time
      return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  async updateLastSyncTime(time: string) {
    try {
      // Check if the table exists first
      await sql`
        SELECT 1 FROM last_sync_records LIMIT 1
      `;
      
      // If table exists, update the record
      await sql`
        INSERT INTO last_sync_records (key_name, value)
        VALUES ('busy_pulse_last_sync', ${time})
        ON CONFLICT (key_name)
        DO UPDATE SET value = EXCLUDED.value
      `;
    } catch (error) {
      // If table doesn't exist, create it first
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS last_sync_records (
            id SERIAL PRIMARY KEY,
            key_name VARCHAR(255) UNIQUE NOT NULL,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
        
        await sql`
          INSERT INTO last_sync_records (key_name, value)
          VALUES ('busy_pulse_last_sync', ${time})
          ON CONFLICT (key_name)
          DO UPDATE SET value = EXCLUDED.value
        `;
      } catch (createError) {
        console.error('Error creating/updating last_sync_records table:', createError);
      }
    }
  }

  async cleanupEventLogs() {
    // Remove event logs older than 30 days
    try {
      await sql`
        DELETE FROM sync_event_log
        WHERE created_at < NOW() - INTERVAL '30 days'
      `;
    } catch (error) {
      console.error('Error cleaning up event logs:', error);
    }
  }
}

export default PulseWatcher;