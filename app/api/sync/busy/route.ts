// app/api/sync/busy/route.ts
import { NextRequest } from "next/server";
import sql from "@/lib/db";
import WooCommerceService, { BusyProductData } from "@/lib/woocommerce";
import { verifySession } from "@/lib/auth"; // We'll use the existing auth for additional security if needed
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function POST(request: NextRequest) {
  let syncLogId: number | undefined;

  try {
    // Handle preflight for POST request
    if (request.method === "OPTIONS") {
      return handleAPICorsPreflight();
    }

    // For now, we're not using API key authentication
    // In a production environment, consider implementing a secure authentication method

    // Verify session for additional security (optional)
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || request.cookies.get("session")?.value;
    let user = null;

    if (token) {
      user = await verifySession(token);
    }

    // Check if the request is gzipped and handle decompression
    const contentEncoding = request.headers.get('content-encoding');
    let busyProducts: BusyProductData[];

    if (contentEncoding === 'gzip') {
      // Read the raw body
      const buffer = await request.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      // Decompress the gzip data
      // Import zlib for Node.js gzip decompression
      const { gunzipSync } = await import('zlib');
      const decompressedBuffer = gunzipSync(uint8Array);

      // Convert decompressed buffer to string
      const decompressedString = new TextDecoder().decode(decompressedBuffer);

      // Parse the JSON from the decompressed string
      busyProducts = JSON.parse(decompressedString) as BusyProductData[];
    } else {
      // Handle non-gzipped request normally
      busyProducts = await request.json();
    }

    // Log the received data for debugging
    console.log("Received Busy Products:", busyProducts);
    console.log("Number of products received:", busyProducts.length);

    if (!Array.isArray(busyProducts) || busyProducts.length === 0) {
      console.log("Invalid product data format or empty array received");
      const response = Response.json({ error: "Invalid product data format" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Log details about each product for debugging
    busyProducts.forEach((product, index) => {
      console.log(`Product ${index + 1}:`, {
        Code: (product as any).Code, // Your data uses 'Code' instead of 'ItemId'
        ItemId: product.ItemId,
        ItemName: product.ItemName,
        PrintName: product.PrintName,
        SalePrice: product.SalePrice,
        TotalAvailableStock: product.TotalAvailableStock
      });
    });

    // Transform the data to ensure it matches the expected BusyProductData format
    const transformedProducts: BusyProductData[] = busyProducts.map(product => ({
      ItemId: (product as any).Code?.toString() || product.ItemId, // Use 'Code' field as ItemId
      ItemName: product.ItemName,
      PrintName: product.PrintName,
      SalePrice: product.SalePrice,
      TotalAvailableStock: product.TotalAvailableStock,
      Category: (product as any).Category,
      Description: (product as any).Description,
      ImageUrl: (product as any).ImageUrl,
    }));

    // Start sync log entry with more detailed information
    const syncLogResult = await sql`
      INSERT INTO busy_sync_logs (
        sync_type,
        status,
        products_processed,
        started_at
      )
      VALUES (
        'product_update',
        'in_progress',
        ${transformedProducts.length},
        NOW()
      )
      RETURNING id
    `;

    syncLogId = syncLogResult[0].id;
    let productsUpdated = 0;
    let productsCreated = 0;
    let productsFailed = 0;

    const startTime = Date.now();
    console.log(`Starting sync of ${transformedProducts.length} products. Log ID: ${syncLogId}`);

    // Initialize WooCommerce service only if credentials are available
    let woocommerceService: WooCommerceService | null = null;
    try {
      woocommerceService = new WooCommerceService();
      console.log("WooCommerce service initialized successfully");
    } catch (error) {
      console.warn("WooCommerce service not initialized:", (error as Error).message);
      console.log("Continuing with Busy sync for local storage only");
    }

    // Process products in batches to minimize API calls and memory usage
    // For large datasets, use a larger batch size to improve performance
    const batchSize = woocommerceService ? 50 : 500; // Larger batches when not syncing to WooCommerce

    const totalBatches = Math.ceil(transformedProducts.length / batchSize);
    console.log(`Processing ${transformedProducts.length} products in ${totalBatches} batches of ${batchSize}`);

    for (let i = 0; i < transformedProducts.length; i += batchSize) {
      const batch = transformedProducts.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;

      // Log progress for large datasets
      if (transformedProducts.length > 1000) {
        console.log(`Processing batch ${batchNumber} of ${totalBatches} (${batch.length} products)`);
      }

      const batchStartTime = Date.now();
      const batchResults = await processProductBatch(batch, woocommerceService);
      const batchProcessingTime = Date.now() - batchStartTime;

      productsUpdated += batchResults.updated;
      productsCreated += batchResults.created;
      productsFailed += batchResults.failed;

      // Log batch performance metrics
      if (transformedProducts.length > 1000) {
        console.log(`Batch ${batchNumber} completed: ${batchResults.updated} updated, ${batchResults.created} created, ${batchResults.failed} failed in ${batchProcessingTime}ms`);
      }

      // Brief pause between batches to allow other operations
      // Only if processing large batches
      if (transformedProducts.length > 5000 && batchNumber < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms pause
      }
    }

    // Update sync log with final status
    await sql`
      UPDATE busy_sync_logs
      SET status = 'completed',
          products_updated = ${productsUpdated},
          products_created = ${productsCreated},
          products_failed = ${productsFailed},
          completed_at = NOW()
      WHERE id = ${syncLogId}
    `;

    // Calculate and log performance metrics
    const endTime = Date.now();
    const processingTime = endTime - startTime; // Actual processing time in ms
    const successRate = transformedProducts.length > 0
      ? ((transformedProducts.length - productsFailed) / transformedProducts.length) * 100
      : 100;

    // Log the sync results for debugging
    console.log("Sync completed with results:", {
      totalProcessed: transformedProducts.length,
      updated: productsUpdated,
      created: productsCreated,
      failed: productsFailed,
      successRate: successRate.toFixed(2) + '%',
      processingTime: `${processingTime}ms`
    });

    const response = Response.json({
      success: true,
      message: `Processed ${transformedProducts.length} products`,
      summary: {
        total: transformedProducts.length,
        updated: productsUpdated,
        created: productsCreated,
        failed: productsFailed,
        success_rate: parseFloat(successRate.toFixed(2)),
        log_id: syncLogId
      }
    });

    console.log("Sending response:", JSON.stringify(response));

    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error in Busy sync API:", error);

    // Log the error details for debugging
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Update sync log with error status if we have a log ID
    // Note: syncLogId might not be defined if error occurred before it was created
    if (typeof syncLogId !== 'undefined') {
      try {
        await sql`
          UPDATE busy_sync_logs
          SET status = 'failed',
              error_message = ${error.message || 'Unknown error'},
              completed_at = NOW()
          WHERE id = ${syncLogId}
        `;
      } catch (logError) {
        console.error("Error updating sync log:", logError);
      }
    }

    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}

// Process a batch of products efficiently with minimal API calls
async function processProductBatch(
  busyProducts: BusyProductData[],
  woocommerceService: WooCommerceService | null
): Promise<{ updated: number; created: number; failed: number }> {

  let updated = 0;
  let created = 0;
  let failed = 0;

  if (woocommerceService) {
    // Extract all SKUs to perform a single batch check for existing products
    const skus = busyProducts.map(product => product.ItemName);

    // Get all existing products in one API call
    const existingProducts = await woocommerceService.getProductsBySKUs(skus);

    // Create maps for both SKU and ID lookups
    const existingProductsBySKU = new Map<string, any>();
    const existingProductsByID = new Map<number, any>();

    for (const product of existingProducts) {
      if (product.id && product.sku) {  // Ensure both id and sku exist before mapping
        existingProductsBySKU.set(product.sku, product);
        existingProductsByID.set(product.id, product);
      }
    }

    // Define types for our update and creation operations
    type ProductUpdate = {
      id: number;
      changes: {
        regular_price: string;
        stock_quantity: number;
        name: string;
        manage_stock?: boolean;
        stock_status?: string;
      };
    };

    type ProductCreate = {
      name: string;
      sku: string;
      regular_price: string;
      stock_quantity: number;
      description: string;
      manage_stock?: boolean;
      stock_status?: string;
    };

    // Separate products that need to be updated vs created
    const productsToUpdate: ProductUpdate[] = [];
    const productsToCreate: ProductCreate[] = [];

    for (const busyProduct of busyProducts) {
      const existingProduct = existingProductsBySKU.get(busyProduct.ItemName);

      if (existingProduct) {
        // Prepare for batch update
        productsToUpdate.push({
          id: existingProduct.id,
          changes: {
            regular_price: busyProduct.SalePrice.toString(),
            stock_quantity: busyProduct.TotalAvailableStock,
            manage_stock: true, // Ensure stock management is enabled
            stock_status: busyProduct.TotalAvailableStock > 0 ? 'instock' : 'outofstock', // Set stock status
            name: busyProduct.PrintName, // Update name in case it changed
          }
        });
      } else {
        // Prepare for batch creation
        productsToCreate.push({
          name: busyProduct.PrintName,
          sku: busyProduct.ItemName,
          regular_price: busyProduct.SalePrice.toString(),
          stock_quantity: busyProduct.TotalAvailableStock,
          manage_stock: true, // Ensure stock management is enabled
          stock_status: busyProduct.TotalAvailableStock > 0 ? 'instock' : 'outofstock', // Set stock status
          description: busyProduct.Description || '',
        });
      }
    }

    // Batch update existing products
    if (productsToUpdate.length > 0) {
      try {
        const updateResults = await woocommerceService.batchUpdateProducts(productsToUpdate);

        // Update our local database records
        for (const update of productsToUpdate) {
          const updatedProduct = existingProductsByID.get(update.id);
          const busyProduct = busyProducts.find(p => p.ItemName === updatedProduct?.sku);
          if (busyProduct) {
            // Check if product already exists to decide between INSERT and UPDATE
            const existingRecord = await sql`
              SELECT id FROM busy_products WHERE busy_item_id = ${busyProduct.ItemId}
            `;

            if (existingRecord.length > 0) {
              // Update existing product
              await sql`
                UPDATE busy_products
                SET
                  item_name = ${busyProduct.ItemName},
                  print_name = ${busyProduct.PrintName},
                  sale_price = ${busyProduct.SalePrice},
                  total_available_stock = ${busyProduct.TotalAvailableStock},
                  woocommerce_product_id = ${update.id},
                  is_synced = ${true},
                  sync_status = ${busyProduct.TotalAvailableStock > 0 ? 'synced' : 'out_of_stock'},
                  last_sync_at = NOW()
                WHERE busy_item_id = ${busyProduct.ItemId}
              `;
            } else {
              // Insert new product
              await sql`
                INSERT INTO busy_products (
                  busy_item_id,
                  item_name,
                  print_name,
                  sale_price,
                  total_available_stock,
                  woocommerce_product_id,
                  is_synced,
                  sync_status,
                  last_sync_at
                )
                VALUES (
                  ${busyProduct.ItemId},
                  ${busyProduct.ItemName},
                  ${busyProduct.PrintName},
                  ${busyProduct.SalePrice},
                  ${busyProduct.TotalAvailableStock},
                  ${update.id},
                  ${true},
                  ${busyProduct.TotalAvailableStock > 0 ? 'synced' : 'out_of_stock'},
                  NOW()
                )
              `;
            }
          }
        }

        updated = productsToUpdate.length;
      } catch (updateError) {
        console.error('Batch update failed:', updateError);
        failed += productsToUpdate.length;
      }
    }

    // Batch create new products
    if (productsToCreate.length > 0) {
      try {
        const createResults = await woocommerceService.batchCreateProducts(productsToCreate);

        // Update our local database records for created products
        for (let i = 0; i < productsToCreate.length; i++) {
          const busyProduct = busyProducts.find(p => p.ItemName === productsToCreate[i].sku);
          if (busyProduct && createResults.create[i]?.id) {
            // Check if product already exists to decide between INSERT and UPDATE
            const existingRecord = await sql`
              SELECT id FROM busy_products WHERE busy_item_id = ${busyProduct.ItemId}
            `;

            if (existingRecord.length > 0) {
              // Update existing product
              await sql`
                UPDATE busy_products
                SET
                  item_name = ${busyProduct.ItemName},
                  print_name = ${busyProduct.PrintName},
                  sale_price = ${busyProduct.SalePrice},
                  total_available_stock = ${busyProduct.TotalAvailableStock},
                  woocommerce_product_id = ${createResults.create[i].id},
                  is_synced = ${true},
                  sync_status = ${busyProduct.TotalAvailableStock > 0 ? 'draft' : 'out_of_stock'},
                  last_sync_at = NOW()
                WHERE busy_item_id = ${busyProduct.ItemId}
              `;
            } else {
              // Insert new product
              await sql`
                INSERT INTO busy_products (
                  busy_item_id,
                  item_name,
                  print_name,
                  sale_price,
                  total_available_stock,
                  woocommerce_product_id,
                  is_synced,
                  sync_status,
                  last_sync_at
                )
                VALUES (
                  ${busyProduct.ItemId},
                  ${busyProduct.ItemName},
                  ${busyProduct.PrintName},
                  ${busyProduct.SalePrice},
                  ${busyProduct.TotalAvailableStock},
                  ${createResults.create[i].id},
                  ${true},
                  ${busyProduct.TotalAvailableStock > 0 ? 'draft' : 'out_of_stock'},
                  NOW()
                )
              `;
            }
          }
        }

        created = productsToCreate.length;
      } catch (createError) {
        console.error('Batch creation failed:', createError);
        failed += productsToCreate.length;
      }
    }
  } else {
    // If WooCommerce service is not available, just store the products in the database
    // For better performance with large datasets, use PostgreSQL's bulk upsert
    console.log(`Storing ${busyProducts.length} Busy products in database without WooCommerce sync`);

    // Process in batches to handle large datasets efficiently
    const subBatchSize = 100;
    for (let j = 0; j < busyProducts.length; j += subBatchSize) {
      const subBatch = busyProducts.slice(j, j + subBatchSize);

      for (const busyProduct of subBatch) {
        try {
          // Use ON CONFLICT to perform upsert (insert or update)
          await sql`
            INSERT INTO busy_products (
              busy_item_id,
              item_name,
              print_name,
              sale_price,
              total_available_stock,
              woocommerce_product_id,
              is_synced,
              sync_status,
              last_sync_at
            )
            VALUES (
              ${busyProduct.ItemId},
              ${busyProduct.ItemName},
              ${busyProduct.PrintName},
              ${busyProduct.SalePrice},
              ${busyProduct.TotalAvailableStock},
              NULL, -- No WooCommerce product ID since we couldn't sync
              ${false}, -- Not synced since WooCommerce is not available
              ${busyProduct.TotalAvailableStock > 0 ? 'pending' : 'out_of_stock'},
              NOW()
            )
            ON CONFLICT (busy_item_id)
            DO UPDATE SET
              item_name = EXCLUDED.item_name,
              print_name = EXCLUDED.print_name,
              sale_price = EXCLUDED.sale_price,
              total_available_stock = EXCLUDED.total_available_stock,
              woocommerce_product_id = EXCLUDED.woocommerce_product_id,
              is_synced = EXCLUDED.is_synced,
              sync_status = EXCLUDED.sync_status,
              last_sync_at = EXCLUDED.last_sync_at
          `;
          created++;
        } catch (dbError) {
          console.error('Database upsert failed for product:', busyProduct, dbError);
          failed++;
        }
      }

      // Small delay between sub-batches to prevent overwhelming the database
      if (busyProducts.length > 1000) {
        await new Promise(resolve => setTimeout(resolve, 5)); // 5ms delay
      }
    }
  }

  return { updated, created, failed };
}