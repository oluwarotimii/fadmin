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

    // Parse the product data from Busy system
    const busyProducts: BusyProductData[] = await request.json();
    
    if (!Array.isArray(busyProducts) || busyProducts.length === 0) {
      const response = Response.json({ error: "Invalid product data format" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Start sync log entry
    const syncLogResult = await sql`
      INSERT INTO busy_sync_logs (sync_type, status, products_processed)
      VALUES ('product_update', 'in_progress', ${busyProducts.length})
      RETURNING id
    `;
    
    const syncLogId = syncLogResult[0].id;
    let productsUpdated = 0;
    let productsCreated = 0;
    let productsFailed = 0;
    
    // Initialize WooCommerce service
    const woocommerceService = new WooCommerceService();
    
    // Process products in batches to minimize API calls
    const batchSize = 10; // Process 10 products at a time
    
    for (let i = 0; i < busyProducts.length; i += batchSize) {
      const batch = busyProducts.slice(i, i + batchSize);
      const batchResults = await processProductBatch(batch, woocommerceService);
      
      productsUpdated += batchResults.updated;
      productsCreated += batchResults.created;
      productsFailed += batchResults.failed;
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

    const response = Response.json({
      success: true,
      message: `Processed ${busyProducts.length} products`,
      summary: {
        total: busyProducts.length,
        updated: productsUpdated,
        created: productsCreated,
        failed: productsFailed
      }
    });
    
    return addAPICorsHeaders(response);
  } catch (error: any) {
    console.error("Error in Busy sync API:", error);
    
    // Update sync log with error status if we have a log ID
    try {
      // This is a simplified error handling - in a real scenario, we'd need to track the syncLogId
      // to update the log properly
    } catch (logError) {
      console.error("Error updating sync log:", logError);
    }
    
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}

// Process a batch of products efficiently with minimal API calls
async function processProductBatch(
  busyProducts: BusyProductData[],
  woocommerceService: WooCommerceService
): Promise<{ updated: number; created: number; failed: number }> {

  let updated = 0;
  let created = 0;
  let failed = 0;

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
    };
  };

  type ProductCreate = {
    name: string;
    sku: string;
    regular_price: string;
    stock_quantity: number;
    description: string;
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
              'synced',
              NOW()
            )
            ON CONFLICT (busy_item_id)
            DO UPDATE SET
              print_name = EXCLUDED.print_name,
              sale_price = EXCLUDED.sale_price,
              total_available_stock = EXCLUDED.total_available_stock,
              woocommerce_product_id = EXCLUDED.woocommerce_product_id,
              is_synced = EXCLUDED.is_synced,
              sync_status = EXCLUDED.sync_status,
              last_sync_at = EXCLUDED.last_sync_at
          `;
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
              'draft',
              NOW()
            )
            ON CONFLICT (busy_item_id)
            DO UPDATE SET
              print_name = EXCLUDED.print_name,
              sale_price = EXCLUDED.sale_price,
              total_available_stock = EXCLUDED.total_available_stock,
              woocommerce_product_id = EXCLUDED.woocommerce_product_id,
              is_synced = EXCLUDED.is_synced,
              sync_status = EXCLUDED.sync_status,
              last_sync_at = EXCLUDED.last_sync_at
          `;
        }
      }

      created = productsToCreate.length;
    } catch (createError) {
      console.error('Batch creation failed:', createError);
      failed += productsToCreate.length;
    }
  }

  return { updated, created, failed };
}