// components/busy-sync-module.tsx
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
  FileTextIcon
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
  sync_type: string;
  status: string; // 'started', 'in_progress', 'completed', 'failed'
  products_processed: number;
  products_updated: number;
  products_created: number;
  products_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export default function BusySyncModule() {
  const [products, setProducts] = useState<BusyProduct[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<BusyProduct | null>(null);
  const [activeTab, setActiveTab] = useState('products');

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
    } catch (error) {
      console.error('Error fetching Busy sync data:', error);
      // On error, ensure arrays are properly set
      setProducts([]);
      setSyncLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);

      // This would trigger a manual sync with the Busy system
      const response = await fetch('/api/sync/busy/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      // Refresh data after sync
      await fetchData();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setSyncing(false);
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
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Manual Sync'}
          </Button>
        </div>
      </div>

      {/* Sync Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full md:w-1/2 lg:w-1/4 grid-cols-2">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
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
                        <TableCell>${product.sale_price.toFixed(2)}</TableCell>
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
                        <TableCell>{log.sync_type}</TableCell>
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
                  <p>${selectedProduct.sale_price.toFixed(2)}</p>
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