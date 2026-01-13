# BUSY Web API Integration Documentation

## Overview
This document outlines the technical implementation for synchronizing product prices and stock levels between BUSY accounting software and a Next.js web platform. The solution uses the BUSY Web API to fetch product information and updates the web platform accordingly.

## Architecture

### Components
1. **Next.js Frontend/Backend**: Web application with API routes
2. **BUSY Web API**: Running on Windows machine (port 981)
3. **Database**: To store product mappings and cache data
4. **Scheduler**: Cron jobs for periodic synchronization
5. **Message Queue**: For handling bulk operations (optional)

### Communication Flow
```
Next.js App → BUSY Web API → BUSY Database
              ← (JSON/XML responses)
```

## Technical Implementation

### 1. Product Mapping Strategy

#### Database Schema
```sql
CREATE TABLE busy_product_mappings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  web_product_id VARCHAR(255) UNIQUE NOT NULL,
  busy_item_code VARCHAR(255) UNIQUE,
  busy_print_name VARCHAR(255),
  busy_item_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Mapping Process
1. Fetch all items from BUSY using API call:
   ```
   GET http://[busy-server]:981
   Headers:
   - SC: 1
   - Qry: SELECT ItemCode, ItemName, PrintName, Rate, QtyOnHand FROM ItemMaster
   - UserName: [username]
   - Pwd: [password]
   ```

2. Match BUSY items with web products using PrintName as identifier
3. Store the mapping in the database for future reference

### 2. Data Synchronization

#### Sync Process
1. **Fetch Current Data from BUSY**:
   ```javascript
   // Example API call to fetch item data
   const fetchBusyItems = async () => {
     const response = await fetch('http://[busy-server]:981', {
       method: 'GET',
       headers: {
         'SC': '1',
         'Qry': 'SELECT ItemCode, ItemName, PrintName, Rate, QtyOnHand FROM ItemMaster',
         'UserName': process.env.BUSY_USERNAME,
         'Pwd': process.env.BUSY_PASSWORD
       }
     });
     
     const xmlText = await response.text();
     const result = response.headers.get('Result');
     const description = response.headers.get('Description');
     
     if (result === 'T') {
       // Parse XML response and return structured data
       return parseXML(xmlText);
     } else {
       throw new Error(`BUSY API Error: ${description}`);
     }
   };
   ```

2. **Compare with Web Platform Data**:
   - Retrieve current web platform product data
   - Compare with BUSY data using the mapping table
   - Identify differences in price and stock

3. **Update Web Platform**:
   - Update prices and stock levels for products that have changed
   - Handle out-of-stock status based on quantity thresholds

### 3. Optimized Synchronization

#### Caching Strategy
- Cache BUSY API responses to reduce API calls
- Implement Redis or similar for temporary data storage
- Cache mapping relationships to avoid repeated database queries

#### Batch Processing
- Process updates in batches to avoid overwhelming the system
- Use pagination for large datasets
- Implement rate limiting to prevent API overload

#### Incremental Updates
- Track last sync timestamp
- Only fetch items that have been modified since last sync
- Use BUSY's audit trail or modification dates if available

### 4. Next.js Implementation

#### Environment Variables
```env
BUSY_SERVER=http://[busy-server]:981
BUSY_USERNAME=your_username
BUSY_PASSWORD=your_password
SYNC_INTERVAL_MINUTES=30
MAX_CONCURRENT_REQUESTS=5
```

#### API Routes

##### Sync Controller
```javascript
// pages/api/busy/sync.js
import { syncProductsFromBusy } from '../../../lib/busy-sync';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await syncProductsFromBusy();
    res.status(200).json(result);
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

##### Individual Product Update
```javascript
// pages/api/busy/update-product.js
import { updateProductFromBusy } from '../../../lib/busy-sync';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { webProductId } = req.body;

  try {
    const result = await updateProductFromBusy(webProductId);
    res.status(200).json(result);
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

#### Core Sync Logic
```javascript
// lib/busy-sync.js
import axios from 'axios';
import xml2js from 'xml2js';

const BUSY_API_URL = process.env.BUSY_SERVER;
const MAX_RETRIES = 3;

// Fetch items from BUSY
export const fetchBusyItems = async () => {
  const config = {
    method: 'GET',
    url: BUSY_API_URL,
    headers: {
      'SC': '1',
      'Qry': 'SELECT ItemCode, ItemName, PrintName, Rate, QtyOnHand FROM ItemMaster',
      'UserName': process.env.BUSY_USERNAME,
      'Pwd': process.env.BUSY_PASSWORD
    },
    timeout: 30000 // 30 seconds timeout
  };

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const response = await axios(config);
      
      const result = response.headers['result'];
      const description = response.headers['description'];
      
      if (result === 'T') {
        // Parse XML response
        const parser = new xml2js.Parser();
        const parsed = await parser.parseStringPromise(response.data);
        return parsed; // Return structured data
      } else {
        throw new Error(`BUSY API Error: ${description}`);
      }
    } catch (error) {
      retries++;
      if (retries >= MAX_RETRIES) {
        throw error;
      }
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
};

// Sync products from BUSY to web platform
export const syncProductsFromBusy = async () => {
  try {
    // Fetch current items from BUSY
    const busyItems = await fetchBusyItems();
    
    // Get product mappings
    const mappings = await getProductMappings(); // Implementation depends on your DB
    
    // Process each item
    const results = [];
    for (const busyItem of busyItems) {
      const mapping = mappings.find(m => 
        m.busy_print_name === busyItem.PrintName || 
        m.busy_item_code === busyItem.ItemCode
      );
      
      if (mapping) {
        // Update web product with BUSY data
        const updateResult = await updateWebProduct(
          mapping.web_product_id,
          {
            price: parseFloat(busyItem.Rate),
            stock: parseInt(busyItem.QtyOnHand),
            status: parseInt(busyItem.QtyOnHand) > 0 ? 'instock' : 'outofstock'
          }
        );
        
        results.push({
          productId: mapping.web_product_id,
          busyItemCode: busyItem.ItemCode,
          success: updateResult.success,
          changes: updateResult.changes
        });
      }
    }
    
    return {
      success: true,
      processedCount: results.length,
      results
    };
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
};
```

### 5. Scheduling and Automation

#### Cron Job Setup
Use a cron job or scheduled task to run synchronization periodically:

```javascript
// lib/scheduler.js
import cron from 'node-cron';
import { syncProductsFromBusy } from './busy-sync';

// Schedule sync every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('Starting BUSY sync job...');
  try {
    const result = await syncProductsFromBusy();
    console.log('Sync completed:', result);
  } catch (error) {
    console.error('Sync failed:', error);
  }
});
```

#### Manual Trigger Endpoint
```javascript
// pages/api/busy/manual-sync.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await syncProductsFromBusy();
    res.status(200).json(result);
  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({ error: error.message });
  }
}
```

### 6. Error Handling and Monitoring

#### Retry Mechanism
- Implement exponential backoff for failed API calls
- Log all errors with sufficient context
- Send alerts for persistent failures

#### Logging
```javascript
// lib/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'busy-sync-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'busy-sync-combined.log' })
  ]
});

export default logger;
```

### 7. Performance Optimization

#### Connection Pooling
- Limit concurrent connections to BUSY API
- Use connection pooling to reuse connections
- Implement circuit breaker pattern for API failures

#### Data Filtering
- Only fetch necessary fields from BUSY
- Filter out inactive products
- Use efficient queries with proper indexing

#### Memory Management
- Process large datasets in chunks
- Clear caches periodically
- Monitor memory usage during sync operations

### 8. Security Considerations

#### API Credentials
- Store BUSY credentials securely in environment variables
- Use encrypted connections if possible
- Implement proper authentication for sync endpoints

#### Input Validation
- Validate all data received from BUSY before processing
- Sanitize data before storing in database
- Implement rate limiting to prevent abuse

### 9. Deployment Considerations

#### Environment Setup
- Ensure the Next.js app can reach the BUSY server
- Configure firewall rules for port 981 access
- Set up monitoring and alerting

#### Scaling
- Use load balancers for high availability
- Implement horizontal scaling for sync operations
- Consider microservices architecture for complex scenarios

This implementation plan provides a robust, scalable solution for synchronizing product prices and stock between BUSY and your Next.js web platform, with optimizations to prevent overloading and ensure reliable operation.
