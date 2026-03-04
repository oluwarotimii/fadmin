// components/busy-web-api-module.tsx
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

// Define types for BUSY Web API data
interface BusyShadowProduct {
  busy_item_code: string;
  busy_item_name: string;
  busy_print_name: string;
  busy_rate: number;
  busy_qty_on_hand: number;
  busy_unit_name: string | null;
  busy_material_center: string | null;
  busy_last_modified: string | null;
  synced_at: string;
  is_active: boolean;
  id: number;
}

interface BusyWebApiSyncLog {
  id: number;
  sync_type: string; // 'web_api_pull'
  status: string; // 'started', 'in_progress', 'completed', 'failed'
  products_processed: number;
  products_updated: number;
  products_created: number;
  products_failed: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
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

interface PulseStatus {
  status: string;
  lastEvent: string | null;
  pendingEvents: number;
  totalSynced: number;
  syncType: string;
}

export default function BusyWebApiModule() {
  const [products, setProducts] = useState<BusyShadowProduct[]>([]);
  const [syncLogs, setSyncLogs] = useState<BusyWebApiSyncLog[]>([]);
  const [pulseStatus, setPulseStatus] = useState<PulseStatus | null>(null);
  const [unlinkedProducts, setUnlinkedProducts] = useState<ProductLink[]>([]);
  const [busyShadowItems, setBusyShadowItems] = useState<BusyShadowItem[]>([]);
  const [syncStatusData, setSyncStatusData] = useState<any>(null);
  const [linkedProductsMap, setLinkedProductsMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<BusyShadowProduct | null>(null);
  const [activeTab, setActiveTab] = useState('products'); // Default to products tab
  const [linkTab, setLinkTab] = useState('dashboard');
  const [syncTab, setSyncTab] = useState('overview');
  const [autoCreateEnabled, setAutoCreateEnabled] = useState(false);
  const [createOnInitialSync, setCreateOnInitialSync] = useState(false);

  // Fetch all data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch BUSY shadow products
      const productsRes = await fetch('/api/busy/shadow-items');
      if (productsRes.ok) {
        const productsResponse = await productsRes.json();
        setProducts(productsResponse.data || []);
      } else {
        setProducts([]);
      }

      // Fetch sync logs for BUSY Web API
      const logsRes = await fetch('/api/busy/logs?sync_type=web_api_pull');
      if (logsRes.ok) {
        const logsResponse = await logsRes.json();
        setSyncLogs(logsResponse.data || []);

        // Find the most recent sync
        if (logsResponse.data && logsResponse.data.length > 0) {
          const recentLog = logsResponse.data[0];
          setLastSync(recentLog.completed_at || recentLog.started_at);
        }
      } else {
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

      // Fetch sync status data
      const syncStatusRes = await fetch('/api/busy/sync-status');
      if (syncStatusRes.ok) {
        const syncStatusResponse = await syncStatusRes.json();
        setSyncStatusData(syncStatusResponse.data || {});
      }

      // Fetch settings
      const settingsRes = await fetch('/api/busy/settings');
      if (settingsRes.ok) {
        const settingsResponse = await settingsRes.json();
        setAutoCreateEnabled(settingsResponse.data?.auto_create_enabled === 'true');
        setCreateOnInitialSync(settingsResponse.data?.create_products_on_initial_sync === 'true');
      }

      // Fetch linked products map
      const linkedProductsRes = await fetch('/api/busy/linked-products-map');
      if (linkedProductsRes.ok) {
        const linkedProductsResponse = await linkedProductsRes.json();
        setLinkedProductsMap(linkedProductsResponse.data || {});
      }
    } catch (error) {
      console.error('Error fetching BUSY Web API data:', error);
      setProducts([]);
      setSyncLogs([]);
      setUnlinkedProducts([]);
      setBusyShadowItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);

      // Trigger BUSY Web API sync
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
      setSyncing(false);
    }
  };

  const getStatusBadge = (stock: number) => {
    // If stock is 0, show as out of stock
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    return <Badge variant="default">In Stock</Badge>;
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

  const toggleAutoCreate = async () => {
    try {
      const response = await fetch('/api/busy/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'auto_create_enabled',
          settingValue: !autoCreateEnabled
        })
      });

      if (response.ok) {
        setAutoCreateEnabled(!autoCreateEnabled);
      } else {
        throw new Error('Failed to update auto-create setting');
      }
    } catch (error) {
      console.error('Error toggling auto-create:', error);
    }
  };

  const toggleCreateOnInitialSync = async () => {
    try {
      const response = await fetch('/api/busy/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'create_products_on_initial_sync',
          settingValue: !createOnInitialSync
        })
      });

      if (response.ok) {
        setCreateOnInitialSync(!createOnInitialSync);
      } else {
        throw new Error('Failed to update initial sync creation setting');
      }
    } catch (error) {
      console.error('Error toggling initial sync creation:', error);
    }
  };

  // Function to check if a BUSY item is linked to a web product
  const isProductLinked = (busyItemCode: string) => {
    // Check if this BUSY item exists in the product_link_mapping table
    // For this to work properly, we'd need to fetch the linked products
    // For now, we'll implement this in the UI rendering
    return false; // Placeholder - will be handled in the UI
  };

  // Function to create a single product on the website
  const createProductOnWebsite = async (busyItem: BusyShadowProduct) => {
    try {
      // Call an API endpoint to create this specific BUSY item as a web product
      const response = await fetch('/api/busy/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busyItemCode: busyItem.busy_item_code,
          name: busyItem.busy_print_name,
          sku: busyItem.busy_item_name,
          price: busyItem.busy_rate,
          stock: busyItem.busy_qty_on_hand
        })
      });

      if (response.ok) {
        // Refresh the data to show the updated product status
        await fetchData();
        console.log(`Created web product for BUSY item: ${busyItem.busy_item_code}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product on website');
      }
    } catch (error) {
      console.error('Error creating product on website:', error);
      alert(`Failed to create product on website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCwIcon className="w-8 h-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading BUSY Web API data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">BUSY Web API Integration</h1>
          <p className="text-muted-foreground">
            Synchronize products directly from BUSY accounting system using the official Web API
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <label htmlFor="create-initial" className="text-sm font-medium">
              Create on initial sync:
            </label>
            <input
              type="checkbox"
              id="create-initial"
              checked={createOnInitialSync}
              onChange={toggleCreateOnInitialSync}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="auto-create" className="text-sm font-medium">
              Auto-create after sync:
            </label>
            <input
              type="checkbox"
              id="auto-create"
              checked={autoCreateEnabled}
              onChange={toggleAutoCreate}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2"
          >
            <CloudIcon className={`w-4 h-4 ${syncing ? 'animate-pulse' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync with BUSY'}
          </Button>
        </div>
      </div>

      {/* Sync Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-2xl">{products.length}</CardTitle>
            <CardDescription>Total BUSY Items</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-2xl">
              {products.filter(p => p.busy_qty_on_hand > 0).length}
            </CardTitle>
            <CardDescription>In Stock</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="p-4">
            <CardTitle className="text-2xl">
              {products.filter(p => p.busy_qty_on_hand === 0).length}
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
          <TabsTrigger value="products">BUSY Items</TabsTrigger>
          <TabsTrigger value="sync-status">Sync Status</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageIcon className="w-5 h-5" />
                  <CardTitle>BUSY Items (Shadow DB)</CardTitle>
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
                Items from BUSY accounting system in the shadow database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Print Name</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Qty On Hand</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const isLinked = linkedProductsMap[product.busy_item_code];

                      return (
                        <TableRow key={product.busy_item_code}>
                          <TableCell className="font-medium">{product.busy_item_code}</TableCell>
                          <TableCell>{product.busy_item_name}</TableCell>
                          <TableCell>{product.busy_print_name}</TableCell>
                          <TableCell>${Number(product.busy_rate).toFixed(2)}</TableCell>
                          <TableCell>{product.busy_qty_on_hand}</TableCell>
                          <TableCell>
                          {getStatusBadge(product.busy_qty_on_hand)}
                          {linkedProductsMap[product.busy_item_code] && (
                            <Badge variant="secondary" className="ml-2">Linked</Badge>
                          )}
                          {!linkedProductsMap[product.busy_item_code] && (
                            <Badge variant="outline" className="ml-2">Not Linked</Badge>
                          )}
                        </TableCell>
                          <TableCell>
                            {product.busy_last_modified ? (() => {
                              try {
                                return format(new Date(product.busy_last_modified), 'MMM d, yyyy');
                              } catch (e) {
                                console.error("Error formatting product last modified date:", e);
                                return 'Invalid date';
                              }
                            })() : 'Unknown'}
                          </TableCell>
                          <TableCell>
                            {!isLinked && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => createProductOnWebsite(product)}
                                className="mr-2"
                              >
                                Create on Website
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProduct(product)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {products.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <PackageIcon className="w-12 h-12 mx-auto opacity-50" />
                  <p className="mt-2">No BUSY items in shadow database yet</p>
                  <p className="text-sm mt-1">Run a sync to populate the shadow database</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync-status" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ZapIcon className="w-5 h-5" />
                <CardTitle>Synchronization Status</CardTitle>
              </div>
              <CardDescription>
                Overview of synchronization between BUSY items and web products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncStatusData ? (
                <div className="space-y-6">
                  {/* Sync Health Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-2 border-blue-200">
                      <CardHeader className="p-4">
                        <CardTitle className="text-xl">{syncStatusData.totalBusyItems}</CardTitle>
                        <CardDescription>Total BUSY Items</CardDescription>
                      </CardHeader>
                    </Card>
                    <Card className="border-2 border-green-200">
                      <CardHeader className="p-4">
                        <CardTitle className="text-xl">{syncStatusData.linkedProducts}</CardTitle>
                        <CardDescription>Products with Handshake</CardDescription>
                      </CardHeader>
                    </Card>
                    <Card className="border-2 border-yellow-200">
                      <CardHeader className="p-4">
                        <CardTitle className="text-xl">{syncStatusData.unlinkedProducts}</CardTitle>
                        <CardDescription>No Handshake</CardDescription>
                      </CardHeader>
                    </Card>
                    <Card className="border-2 border-red-200">
                      <CardHeader className="p-4">
                        <CardTitle className="text-xl">{syncStatusData.syncIssues}</CardTitle>
                        <CardDescription>Sync Issues</CardDescription>
                      </CardHeader>
                    </Card>
                  </div>

                  {/* Sync Health Indicator */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Sync Health</CardTitle>
                      <CardDescription>
                        Overall synchronization health: {syncStatusData.syncHealth}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className={`h-4 rounded-full ${
                            syncStatusData.syncHealth >= 90 ? 'bg-green-500' :
                            syncStatusData.syncHealth >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${syncStatusData.syncHealth}%` }}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Sync Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Sync Activity</CardTitle>
                      <CardDescription>
                        Latest synchronization events and changes
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Event Type</TableHead>
                              <TableHead>BUSY Item</TableHead>
                              <TableHead>Change</TableHead>
                              <TableHead>Time</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {syncStatusData.recentActivity && syncStatusData.recentActivity.length > 0 ? (
                              syncStatusData.recentActivity.map((activity: any, index: number) => (
                                <TableRow key={index}>
                                  <TableCell>
                                    <Badge variant={
                                      activity.event_type === 'PRICE_CHANGE' ? 'default' :
                                      activity.event_type === 'STOCK_CHANGE' ? 'secondary' :
                                      activity.event_type === 'CREATE' ? 'outline' : 'destructive'
                                    }>
                                      {activity.event_type}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{activity.busy_item_code}</TableCell>
                                  <TableCell>
                                    {activity.old_values && activity.new_values ? (
                                      <div>
                                        {activity.event_type.includes('PRICE') && (
                                          <span>Price: {JSON.parse(activity.old_values).rate} → {JSON.parse(activity.new_values).rate}</span>
                                        )}
                                        {activity.event_type.includes('STOCK') && (
                                          <span>Stock: {JSON.parse(activity.old_values).qty_on_hand} → {JSON.parse(activity.new_values).qty_on_hand}</span>
                                        )}
                                      </div>
                                    ) : 'N/A'}
                                  </TableCell>
                                  <TableCell>
                                    {activity.created_at ? format(new Date(activity.created_at), 'MMM d, yyyy HH:mm') : 'Unknown'}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                  No recent sync activity
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCwIcon className="w-12 h-12 mx-auto opacity-50 animate-spin" />
                  <p className="mt-2">Loading sync status...</p>
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
                History of BUSY Web API synchronization operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
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
            <DialogTitle>BUSY Item Details</DialogTitle>
            <DialogDescription>
              Detailed information about the BUSY item from the shadow database
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Item Code</h4>
                  <p>{selectedProduct.busy_item_code}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Item Name</h4>
                  <p>{selectedProduct.busy_item_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Print Name</h4>
                  <p>{selectedProduct.busy_print_name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Rate</h4>
                  <p>${Number(selectedProduct.busy_rate).toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Qty On Hand</h4>
                  <p>{selectedProduct.busy_qty_on_hand}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Unit</h4>
                  <p>{selectedProduct.busy_unit_name || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">Material Center</h4>
                  <p>{selectedProduct.busy_material_center || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Last Modified</h4>
                  <p>
                    {selectedProduct.busy_last_modified ? (() => {
                      try {
                        return format(new Date(selectedProduct.busy_last_modified), 'MMM d, yyyy HH:mm:ss');
                      } catch (e) {
                        console.error("Error formatting selected product last modified date:", e);
                        return 'Invalid date';
                      }
                    })() : 'Unknown'}
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