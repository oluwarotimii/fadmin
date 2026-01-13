-- Busy Accounting Stock Monitor (BASM) Database Schema

-- Create busy_products table to store products from Busy accounting system
CREATE TABLE IF NOT EXISTS busy_products (
  id SERIAL PRIMARY KEY,
  busy_item_id VARCHAR(255), -- The unique identifier from Busy system
  item_name VARCHAR(255) NOT NULL, -- Maps to WooCommerce sku
  print_name VARCHAR(255) NOT NULL, -- Maps to WooCommerce name
  sale_price DECIMAL(10, 2) NOT NULL,
  total_available_stock INTEGER DEFAULT 0,
  category VARCHAR(255),
  description TEXT,
  image_url TEXT,
  woocommerce_product_id INTEGER, -- Reference to WooCommerce product ID if synced
  is_synced BOOLEAN DEFAULT FALSE, -- Whether this product has been synced to WooCommerce
  sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, draft, error
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create busy_sync_logs table to track sync operations
CREATE TABLE IF NOT EXISTS busy_sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'full', 'partial', 'product_update'
  status VARCHAR(50) NOT NULL, -- 'started', 'in_progress', 'completed', 'failed'
  products_processed INTEGER DEFAULT 0,
  products_updated INTEGER DEFAULT 0,
  products_created INTEGER DEFAULT 0,
  products_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_busy_products_item_name ON busy_products(item_name);
CREATE INDEX IF NOT EXISTS idx_busy_products_busy_item_id ON busy_products(busy_item_id);
CREATE INDEX IF NOT EXISTS idx_busy_products_sync_status ON busy_products(sync_status);
CREATE INDEX IF NOT EXISTS idx_busy_products_is_synced ON busy_products(is_synced);
CREATE INDEX IF NOT EXISTS idx_busy_sync_logs_started_at ON busy_sync_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_busy_sync_logs_status ON busy_sync_logs(status);