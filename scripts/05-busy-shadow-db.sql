-- scripts/05-busy-shadow-db.sql
-- Create shadow database tables for BUSY Web API integration

-- Shadow table for BUSY products
CREATE TABLE IF NOT EXISTS busy_product_shadow (
  id SERIAL PRIMARY KEY,
  busy_item_code VARCHAR(255) UNIQUE NOT NULL,
  busy_item_name VARCHAR(500),
  busy_print_name VARCHAR(500),
  busy_rate DECIMAL(10,2),
  busy_qty_on_hand INTEGER,
  busy_unit_name VARCHAR(100),
  busy_material_center VARCHAR(255),
  busy_last_modified TIMESTAMP,
  synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Link table between web products and BUSY shadow
CREATE TABLE IF NOT EXISTS product_link_mapping (
  id SERIAL PRIMARY KEY,
  web_product_id VARCHAR(255) NOT NULL,
  busy_item_code VARCHAR(255),
  is_sync_enabled BOOLEAN DEFAULT TRUE,
  auto_create_enabled BOOLEAN DEFAULT FALSE, -- New field for auto-creation toggle
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table for global sync configuration
CREATE TABLE IF NOT EXISTS busy_sync_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default values
INSERT INTO busy_sync_settings (setting_key, setting_value)
SELECT 'auto_create_enabled', 'false'
WHERE NOT EXISTS (SELECT 1 FROM busy_sync_settings WHERE setting_key = 'auto_create_enabled');

INSERT INTO busy_sync_settings (setting_key, setting_value)
SELECT 'create_products_on_initial_sync', 'false'
WHERE NOT EXISTS (SELECT 1 FROM busy_sync_settings WHERE setting_key = 'create_products_on_initial_sync');

-- Event log for tracking changes
CREATE TABLE IF NOT EXISTS sync_event_log (
  id SERIAL PRIMARY KEY,
  busy_item_code VARCHAR(255),
  event_type VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'PRICE_CHANGE', 'STOCK_CHANGE'
  old_values JSONB,
  new_values JSONB,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_busy_product_shadow_code ON busy_product_shadow(busy_item_code);
CREATE INDEX IF NOT EXISTS idx_busy_product_shadow_active ON busy_product_shadow(is_active);
CREATE INDEX IF NOT EXISTS idx_product_link_mapping_web_id ON product_link_mapping(web_product_id);
CREATE INDEX IF NOT EXISTS idx_product_link_mapping_busy_code ON product_link_mapping(busy_item_code);
CREATE INDEX IF NOT EXISTS idx_sync_event_log_item_code ON sync_event_log(busy_item_code);
CREATE INDEX IF NOT EXISTS idx_sync_event_log_created_at ON sync_event_log(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_event_log_processed_at ON sync_event_log(processed_at);