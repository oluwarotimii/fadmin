# Busy Accounting Stock Monitor (BASM) Integration

## Overview
The Busy Accounting Stock Monitor (BASM) integration allows you to synchronize product information from your Busy accounting system to your WooCommerce store. This feature provides real-time inventory and price synchronization while maintaining control over product publishing.

## Key Features
- **Automatic Sync**: Updates prices and stock quantities for existing WooCommerce products
- **New Product Creation**: Creates new products found in Busy as drafts for manual review
- **Sync Monitoring**: Comprehensive logging and monitoring of synchronization activities
- **Batch Processing**: Optimized operations to minimize API calls and improve performance

## Database Schema

### busy_products Table
- Stores products from the Busy accounting system
- Fields:
  - `id`: Primary key
  - `busy_item_id`: Unique identifier from Busy system
  - `item_name`: Maps to WooCommerce SKU
  - `print_name`: Maps to WooCommerce product name
  - `sale_price`: Product price
  - `total_available_stock`: Available stock quantity
  - `woocommerce_product_id`: Reference to WooCommerce product ID
  - `is_synced`: Whether product has been synced
  - `sync_status`: Status (pending, synced, draft, error)
  - `last_sync_at`: Timestamp of last sync

### busy_sync_logs Table
- Tracks synchronization operations
- Fields:
  - `id`: Primary key
  - `sync_type`: Type of sync (full, partial, product_update)
  - `status`: Sync status (started, in_progress, completed, failed)
  - `products_processed`: Count of products processed
  - `products_updated`: Count of products updated
  - `products_created`: Count of products created
  - `products_failed`: Count of failed operations
  - `error_message`: Error details if any
  - `started_at`: Sync start time
  - `completed_at`: Sync completion time

## API Endpoints

### `/api/sync/busy`
- **Method**: POST
- **Purpose**: Receives product data from Busy system and syncs to WooCommerce
- **Authentication**: Session-based (no API key required)
- **Payload**: Array of Busy product objects

### `/api/sync/busy/manual`
- **Method**: POST
- **Purpose**: Triggers a manual synchronization
- **Authentication**: Session-based

### `/api/busy/products`
- **Method**: GET
- **Purpose**: Fetch products from Busy sync system
- **Parameters**: 
  - `limit` (default: 20)
  - `offset` (default: 0)
  - `status` (optional filter)

### `/api/busy/logs`
- **Method**: GET
- **Purpose**: Fetch synchronization logs
- **Parameters**:
  - `limit` (default: 20)
  - `offset` (default: 0)
  - `status` (optional filter)
  - `type` (optional filter)

### `/api/busy/test`
- **Method**: GET
- **Purpose**: Diagnostic endpoint to check system status

## UI Components

### Busy Sync Module
The main dashboard interface with:
- Product listing with status indicators
- Sync logs view
- Manual sync trigger button
- Summary cards showing sync statistics
- Detailed product view in modal

### Navigation Integration
- Added "Busy Sync" tab to the main navigation
- Uses CubeIcon for visual consistency
- Integrated seamlessly with existing modules

## Performance Features

### Batch Processing
- Processes products in batches of 10 to minimize API calls
- Groups operations to optimize WooCommerce API usage
- Handles both updates and creations efficiently

### Caching System
- In-memory caching for:
  - WooCommerce product lookups
  - API response caching
  - Dashboard data caching
- Cache TTL: 2-5 minutes depending on data type

## Security
- Session-based authentication
- Input validation
- Error handling and logging
- No API key currently required (can be added later)

## Configuration

### Environment Variables
Required:
```env
WOOCOMMERCE_URL=https://yourstore.com
WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret
```

### Required Setup
1. Run the database migration script `04-busy-sync.sql`
2. Configure WooCommerce API credentials
3. Restart the application

## Usage

### Automatic Sync
The system receives product data from the Busy system through the `/api/sync/busy` endpoint. When data is received:

1. Existing products are updated with new prices and stock levels
2. New products are created in draft status for manual review
3. All operations are logged in `busy_sync_logs`
4. Local database is updated to track sync status

### Manual Sync
Administrators can trigger manual synchronization using the dashboard interface.

### Monitoring
Monitor sync performance through:
- Sync statistics cards
- Detailed sync logs
- Product status tracking

## Error Handling
- Failed operations are logged with detailed error messages
- Products that fail to sync can be retried manually
- System health can be checked through the test endpoint

## Integration with Existing Features
- Seamless integration with existing dashboard layout
- Consistent UI design with other modules
- Shared authentication and session management
- Common UI components following the same patterns

## Best Practices
- Monitor sync logs regularly
- Review draft products created from Busy system
- Ensure WooCommerce API credentials remain secure
- Plan maintenance windows for large sync operations