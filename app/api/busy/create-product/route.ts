// app/api/busy/create-product/route.ts
import { NextRequest } from "next/server";
import sql from "@/lib/db";
import WooCommerceService from "@/lib/woocommerce";
import { verifySession } from "@/lib/auth";
import { handleAPICorsPreflight, addAPICorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return handleAPICorsPreflight();
}

export async function POST(request: NextRequest) {
  try {
    // Handle preflight
    if (request.method === "OPTIONS") {
      return handleAPICorsPreflight();
    }

    // Verify session
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.split(" ")[1] || request.cookies.get("session")?.value;

    if (!token) {
      const response = Response.json({ error: "Authorization token required" }, { status: 401 });
      return addAPICorsHeaders(response);
    }

    const user = await verifySession(token);
    if (!user) {
      const response = Response.json({ error: "Invalid or expired session" }, { status: 401 });
      return addAPICorsHeaders(response);
    }

    const { busyItemCode, name, sku, price, stock } = await request.json();

    if (!busyItemCode || !name || !sku || price === undefined || stock === undefined) {
      const response = Response.json({ error: "busyItemCode, name, sku, price, and stock are required" }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Check if this BUSY item already has a web product link
    const existingLink = await sql`
      SELECT web_product_id FROM product_link_mapping 
      WHERE busy_item_code = ${busyItemCode}
    `;

    if (existingLink.length > 0) {
      const response = Response.json({ 
        error: "This BUSY item is already linked to a web product", 
        webProductId: existingLink[0].web_product_id 
      }, { status: 400 });
      return addAPICorsHeaders(response);
    }

    // Initialize WooCommerce service
    let woocommerceService: WooCommerceService | null = null;
    try {
      woocommerceService = new WooCommerceService();
    } catch (error) {
      console.error("WooCommerce service initialization failed:", error);
      const response = Response.json({ error: "WooCommerce service not configured" }, { status: 500 });
      return addAPICorsHeaders(response);
    }

    if (!woocommerceService) {
      const response = Response.json({ error: "WooCommerce service not available" }, { status: 500 });
      return addAPICorsHeaders(response);
    }

    // Create product in WooCommerce
    try {
      const productData = {
        name: name,
        sku: sku,
        regular_price: price.toString(),
        stock_quantity: stock,
        manage_stock: true,
        stock_status: stock > 0 ? 'instock' : 'outofstock',
        status: 'draft' as const, // Create as draft for manual review
        description: `Product created from BUSY: ${busyItemCode}`
      };

      const createdProduct = await woocommerceService.createProduct(productData);

      if (!createdProduct.id) {
        throw new Error('Failed to create product: No ID returned');
      }

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
          ${busyItemCode},
          true,
          false
        )
        ON CONFLICT (web_product_id)
        DO UPDATE SET
          busy_item_code = EXCLUDED.busy_item_code,
          is_sync_enabled = EXCLUDED.is_sync_enabled,
          auto_create_enabled = EXCLUDED.auto_create_enabled
      `;

      const response = Response.json({
        success: true,
        message: "Product created successfully",
        webProductId: createdProduct.id,
        webProduct: createdProduct
      });

      return addAPICorsHeaders(response);
    } catch (error) {
      console.error("Error creating product in WooCommerce:", error);
      const response = Response.json({ 
        error: error instanceof Error ? error.message : "Failed to create product in WooCommerce" 
      }, { status: 500 });
      return addAPICorsHeaders(response);
    }
  } catch (error: any) {
    console.error("Error in create product API:", error);
    const response = Response.json({ error: error.message }, { status: 500 });
    return addAPICorsHeaders(response);
  }
}