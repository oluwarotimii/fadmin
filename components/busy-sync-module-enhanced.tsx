// components/busy-sync-module-enhanced.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PackageIcon,
  FileTextIcon,
  ZapIcon,
  CloudIcon
} from "lucide-react";
import { format } from 'date-fns';

// Define types for our data
interface BusyProduct {
  id: number;
  busy_item_id: string;
  item_name: string;
  print_name: string;
  sale_price: number;
  total_available_stock: number;
  woocommerce_product_id: number | null;
  is_synced: boolean;
  sync_status: string; // 'pending', 'synced', 'draft', 'error'
  last_sync_at: string;
  created_at: string;
}

interface SyncLog {
  id: number;
  sync_type: string; // 'product_update', 'manual_sync', 'web_api_pull', 'push_from_service'
  status: string; // 'started', 'in_progress', 'completed', 'failed'
  products_processed: number;
  products_updated: number;
  products_created: number;
  products_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

interface PulseStatus {
  status: string;
  lastEvent: string | null;
  pendingEvents: number;
  totalSynced: number;
  syncType: string;
}

interface ProductLink {
  id: string;
  name: string;
  sku: string;
}

interface BusyShadowItem {
  busy_item_code: string;
  busy_item_name: string;
  busy_print_name: string;
  busy_rate: number;
  busy_qty_on_hand: number;
  busy_unit_name: string | null;
  busy_material_center: string | null;
  busy_last_modified: string | null;
}

export default function BusySyncModuleEnhanced() {
  const [products, setProducts] = useState<BusyProduct[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [pulseStatus, setPulseStatus] = useState<PulseStatus | null>(null);
  const [unlinkedProducts, setUnlinkedProducts] = useState<ProductLink[]>([]);
  const [busyShadowItems, setBusyShadowItems] = useState<BusyShadowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushSyncing, setPushSyncing] = useState(false);
  const [webApiSyncing, setWebApiSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<BusyProduct | null>(null);
  const [activeTab, setActiveTab] = useState('products');
  const [linkTab, setLinkTab] = useState('dashboard');

  // Fetch all data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch busy products
      const productsRes = await fetch('/api/busy/products');
      if (productsRes.ok) {
        const productsResponse = await productsRes.json();
        // Extract the data from the response object
        const productsData = Array.isArray(productsResponse.data) ? productsResponse.data : [];
        setProducts(productsData);
      } else {
        // If the API call fails, set an empty array
        setProducts([]);
      }

      // Fetch sync logs
      const logsRes = await fetch('/api/busy/logs');
      if (logsRes.ok) {
        const logsResponse = await logsRes.json();
        // Extract the data from the response object
        const logsData = Array.isArray(logsResponse.data) ? logsResponse.data : [];
        setSyncLogs(logsData);

        // Find the most recent sync
        if (logsData.length > 0) {
          const recentLog = logsData[0];
          setLastSync(recentLog.completed_at || recentLog.started_at);
        }
      } else {
        // If the API call fails, set an empty array
        setSyncLogs([]);
      }

      // Fetch pulse status
      const pulseRes = await fetch('/api/busy/pulse-status');
      if (pulseRes.ok) {
        const pulseResponse = await pulseRes.json();
        setPulseStatus(pulseResponse.data);
      }

      // Fetch unlinked products
      const unlinkedRes = await fetch('/api/busy/unlinked-products');
      if (unlinkedRes.ok) {
        const unlinkedResponse = await unlinkedRes.json();
        setUnlinkedProducts(unlinkedResponse.data || []);
      }

      // Fetch BUSY shadow items
      const shadowRes = await fetch('/api/busy/shadow-items');
      if (shadowRes.ok) {
        const shadowResponse = await shadowRes.json();
        setBusyShadowItems(shadowResponse.data || []);
      }
    } catch (error) {
      console.error('Error fetching Busy sync data:', error);
      // On error, ensure arrays are properly set
      setProducts([]);
      setSyncLogs([]);
      setUnlinkedProducts([]);
      setBusyShadowItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePushSync = async () => {
    try {
      setPushSyncing(true);

      // This would trigger a manual sync with the Busy system (push-based)
      const response = await fetch('/api/sync/busy/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Push sync failed');
      }

      // Refresh data after sync
      await fetchData();
    } catch (error) {
      console.error('Push sync failed:', error);
    } finally {
      setPushSyncing(false);
    }
  };

  const handleWebApiSync = async () => {
    try {
      setWebApiSyncing(true);

      // This would trigger a sync using BUSY Web API (pull-based)
      const response = await fetch('/api/sync/busy/web-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Web API sync failed');
      }

      // Refresh data after sync
      await fetchData();
    } catch (error) {
      console.error('Web API sync failed:', error);
    } finally {
      setWebApiSyncing(false);
    }
  };

  const getStatusBadge = (status: string, stock?: number) => {
    // If stock is 0, always show as out of stock regardless of sync status
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }

    switch (status) {
      case 'synced':
        return <Badge variant="default">Synced</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncLogStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircleIcon className="w-3 h-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangleIcon className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><RefreshCwIcon className="w-3 h-3 mr-1" /> In Progress</Badge>;
      case 'started':
        return <Badge variant="outline"><ClockIcon className="w-3 h-3 mr-1" /> Started</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSyncTypeBadge = (type: string) => {
    switch (type) {
      case 'web_api_pull':
        return <Badge variant="outline"><CloudIcon className="w-3 h-3 mr-1" /> Web API</Badge>;
      case 'push_from_service':
        return <Badge variant="outline"><ZapIcon className="w-3 h-3 mr-1" /> Push Service</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const linkProduct = async (webProductId: string, busyItemCode: string) => {
    try {
      const response = await fetch('/api/busy/link-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webProductId, busyItemCode })
      });

      if (response.ok) {
        // Refresh data after linking
        await fetchData();
      } else {
        throw new Error('Failed to link product');
      }
    } catch (error) {
      console.error('Error linking product:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading Busy sync data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Busy Accounting Sync</h1>
          <p className="text-muted-foreground">
            Manage inventory synchronization between Busy accounting system and WooCommerce
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handlePushSync}
            disabled={pushSyncing}
            className="flex items-center gap-2"
          >
            <ZapIcon className={`w-4 h-4 ${pushSyncing ? 'animate-pulse' : ''}`} />
            {pushSyncing ? 'Push Syncing...' : 'Push Sync (Legacy)'}
          </Button>
          <Button
            onClick={handleWebApiSync}
            disabled={webApiSyncing}
            className="flex items-center gap-2"
          >
            <CloudIcon className={`w-4 h-4 ${webApiSyncing ? 'animate-pulse' : ''}`} />
            {webApiSyncing ? 'Web API Syncing...' : 'Web API Sync (New)'}
          </Button>
        </div>
      </div>

      {/* Sync Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-2xl">{products.length}</CardTitle>
            <CardDescription>Total Products</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-2xl">
              {products.filter(p => p.sync_status === 'synced').length}
            </CardTitle>
            <CardDescription>Synced Products</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-2xl">
              {products.filter(p => p.sync_status === 'draft').length}
            </CardTitle>
            <CardDescription>Draft Products</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-2xl">
              {products.filter(p => p.total_available_stock === 0).length}
            </CardTitle>
            <CardDescription>Out of Stock</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-2xl">
              {pulseStatus?.totalSynced || 0}
            </CardTitle>
            <CardDescription>Shadow DB</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Pulse Status Card */}
      {pulseStatus && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ZapIcon className="w-5 h-5" />
              <CardTitle>Pulse Watcher Status</CardTitle>
            </div>
            <CardDescription>
              Real-time monitoring of BUSY changes using the shadow database approach
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-1">Status</h4>
                <p className="text-sm">{pulseStatus.status}</p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-1">Last Event</h4>
                <p className="text-sm">
                  {pulseStatus.lastEvent ? format(new Date(pulseStatus.lastEvent), 'MMM d, yyyy HH:mm') : 'Never'}
                </p>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-1">Pending Events</h4>
                <p className="text-sm">{pulseStatus.pendingEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-2/3 lg:w-1/3 grid-cols-3">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
          <TabsTrigger value="linking">Product Linking</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageIcon className="w-5 h-5" />
                  <CardTitle>Busy Products</CardTitle>
                </div>
                <div className="text-sm text-muted-foreground">
                  Last sync: {lastSync ? (() => {
                    try {
                      return format(new Date(lastSync), 'MMM d, yyyy HH:mm');
                    } catch (e) {
                      console.error("Error formatting date:", e);
                      return 'Invalid date';
                    }
                  })() : 'Never'}
                </div>
              </div>
              <CardDescription>
                Products from Busy accounting system synced to WooCommerce
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Print Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.item_name}</TableCell>
                        <TableCell>{product.print_name}</TableCell>
                        <TableCell>${Number(product.sale_price).toFixed(2)}</TableCell>
                        <TableCell>{product.total_available_stock}</TableCell>
                        <TableCell>{getStatusBadge(product.sync_status, product.total_available_stock)}</TableCell>
                        <TableCell>
                          {product.last_sync_at ? (() => {
                            try {
                              return format(new Date(product.last_sync_at), 'MMM d, yyyy');
                            } catch (e) {
                              console.error("Error formatting product sync date:", e);
                              return 'Invalid date';
                            }
                          })() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProduct(product)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <PackageIcon className="w-12 h-12 mx-auto opacity-50" />
                  <p className="mt-2">No products from Busy accounting system yet</p>
                  <p className="text-sm mt-1">Products will appear here after the first sync</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileTextIcon className="w-5 h-5" />
                <CardTitle>Sync Logs</CardTitle>
              </div>
              <CardDescription>
                History of synchronization operations with Busy accounting system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Failed</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getSyncTypeBadge(log.sync_type)}</TableCell>
                        <TableCell>{getSyncLogStatus(log.status)}</TableCell>
                        <TableCell>{log.products_processed}</TableCell>
                        <TableCell>{log.products_updated}</TableCell>
                        <TableCell>{log.products_created}</TableCell>
                        <TableCell>{log.products_failed}</TableCell>
                        <TableCell>{(() => {
                          try {
                            return format(new Date(log.started_at), 'MMM d, yyyy HH:mm');
                          } catch (e) {
                            console.error("Error formatting log started date:", e);
                            return 'Invalid date';
                          }
                        })()}</TableCell>
                        <TableCell>
                          {log.completed_at ? (() => {
                            try {
                              return format(new Date(log.completed_at), 'MMM d, yyyy HH:mm');
                            } catch (e) {
                              console.error("Error formatting log completed date:", e);
                              return 'Invalid date';
                            }
                          })() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {syncLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <FileTextIcon className="w-12 h-12 mx-auto opacity-50" />
                  <p className="mt-2">No sync logs yet</p>
                  <p className="text-sm mt-1">Logs will appear here after the first sync operation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="linking" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ZapIcon className="w-5 h-5" />
                <CardTitle>Product Linking</CardTitle>
              </div>
              <CardDescription>
                Link BUSY items to web products for automatic synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={linkTab} onValueChange={setLinkTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="dashboard">Link Manager</TabsTrigger>
                  <TabsTrigger value="instructions">Setup Instructions</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-3">Unlinked Web Products</h3>
                      <div className="rounded-md border max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product ID</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Link to BUSY</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unlinkedProducts.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.id}</TableCell>
                                <TableCell>{product.name}</TableCell>
                                <TableCell>{product.sku}</TableCell>
                                <TableCell>
                                  <select
                                    onChange={(e) => e.target.value && linkProduct(product.id, e.target.value)}
                                    className="w-full border rounded p-1 text-xs"
                                    defaultValue=""
                                  >
                                    <option value="">Select BUSY Item</option>
                                    {busyShadowItems.map(item => (
                                      <option key={item.busy_item_code} value={item.busy_item_code}>
                                        {item.busy_print_name} ({item.busy_item_code})
                                      </option>
                                    ))}
                                  </select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium mb-3">BUSY Items (Shadow DB)</h3>
                      <div className="rounded-md border max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Item Code</TableHead>
                              <TableHead>Print Name</TableHead>
                              <TableHead>Rate</TableHead>
                              <TableHead>Qty On Hand</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {busyShadowItems.slice(0, 20).map((item) => (
                              <TableRow key={item.busy_item_code}>
                                <TableCell className="font-medium">{item.busy_item_code}</TableCell>
                                <TableCell>{item.busy_print_name}</TableCell>
                                <TableCell>${Number(item.busy_rate).toFixed(2)}</TableCell>
                                <TableCell>{item.busy_qty_on_hand}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="instructions" className="space-y-4">
                  <div className="prose max-w-none">
                    <h3 className="text-lg font-medium">BUSY Web API Setup Instructions</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>Ensure BUSY accounting software is running and logged into a company</li>
                      <li>Enable the BUSY Web Service on port 981 (or your configured port)</li>
                      <li>Set up the required environment variables in your deployment:</li>
                      <ul className="list-disc pl-5 mt-2">
                        <li><code>BUSY_SERVER</code>: Full URL to BUSY Web Service (e.g., http://192.168.1.100:981)</li>
                        <li><code>BUSY_USERNAME</code>: Valid BUSY company username</li>
                        <li><code>BUSY_PASSWORD</code>: Password for the BUSY user</li>
                      </ul>
                      <li>Run the database migration to create shadow database tables</li>
                      <li>Configure the Pulse Watcher service to run continuously for real-time updates</li>
                    </ol>
                    
                    <div className="mt-4 p-4 bg-blue-50 rounded-md">
                      <h4 className="font-medium text-blue-800">Two Sync Methods Available:</h4>
                      <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li><strong>Push Sync (Legacy)</strong>: Traditional method where BUSY Windows service pushes data to your API</li>
                        <li><strong>Web API Sync (New)</strong>: Modern method where your app pulls data directly from BUSY Web API</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Detailed information about the product from Busy accounting system
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Item ID</h4>
                  <p>{selectedProduct.busy_item_id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Item Name</h4>
                  <p>{selectedProduct.item_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Print Name</h4>
                  <p>{selectedProduct.print_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Price</h4>
                  <p>${Number(selectedProduct.sale_price).toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Stock</h4>
                  <p>{selectedProduct.total_available_stock}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Sync Status</h4>
                  <p>{getStatusBadge(selectedProduct.sync_status, selectedProduct.total_available_stock)}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Last Sync</h4>
                  <p>
                    {selectedProduct.last_sync_at ? (() => {
                      try {
                        return format(new Date(selectedProduct.last_sync_at), 'MMM d, yyyy HH:mm:ss');
                      } catch (e) {
                        console.error("Error formatting selected product sync date:", e);
                        return 'Invalid date';
                      }
                    })() : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}