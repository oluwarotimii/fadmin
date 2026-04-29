"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CloudArrowUpIcon } from "@heroicons/react/24/outline";

interface Referrer {
  id: number;
  name: string;
  code: string;
  created_at: string;
  total_downloads: number;
}

interface SummaryStat {
  id: number;
  name: string;
  code: string;
  today_count: string;
  week_count: string;
  total_count: string;
}

interface DailyStat {
  name: string;
  code: string;
  date: string;
  count: string;
}

interface WeeklyStat {
  name: string;
  code: string;
  week: string;
  count: string;
}

export default function ReferralModule() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [stats, setStats] = useState<{
    summary: SummaryStat[];
    daily: DailyStat[];
    weekly: WeeklyStat[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [error, setError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [referrersRes, statsRes] = await Promise.all([
        fetch("/api/referrers"),
        fetch("/api/referrers/stats")
      ]);

      const referrersData = await referrersRes.json();
      const statsData = await statsRes.json();

      if (referrersData.success) setReferrers(referrersData.data);
      if (statsData.success) setStats(statsData.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddReferrer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newName || !newCode) {
      setError("Name and code are required");
      return;
    }

    try {
      const res = await fetch("/api/referrers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, code: newCode })
      });

      const data = await res.json();
      if (data.success) {
        setNewName("");
        setNewCode("");
        setIsDialogOpen(false);
        fetchData();
      } else {
        setError(data.error || "Failed to add referrer");
      }
    } catch (err) {
      setError("An error occurred");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const names = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.toLowerCase().includes("name")); // Filter header

      if (names.length === 0) {
        alert("No names found in CSV");
        setIsImporting(false);
        return;
      }

      try {
        const res = await fetch("/api/referrers/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names })
        });
        const data = await res.json();
        if (data.success) {
          alert(`Successfully imported ${data.data.length} referrers with auto-generated codes.`);
          fetchData();
        } else {
          alert(data.error || "Failed to import CSV");
        }
      } catch (err) {
        alert("An error occurred during import");
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  if (isLoading && !referrers.length) {
    return <div className="p-8 text-center bg-card rounded-xl border">Loading referral data...</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Referral System</h2>
          <p className="text-muted-foreground">Track app downloads facilitated by sales executives.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            <CloudArrowUpIcon className="w-4 h-4" />
            {isImporting ? "Importing..." : "Import CSV"}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none bg-primary hover:bg-primary/90">Add New Referrer</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Referrer</DialogTitle>
                <DialogDescription>
                  Create a new referral code for a sales executive.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddReferrer} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <Input 
                    placeholder="e.g. John Doe" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Referral Code</label>
                  <Input 
                    placeholder="e.g. JOHN2026" 
                    value={newCode} 
                    onChange={(e) => setNewCode(e.target.value)}
                    className="bg-muted/50"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Save Referrer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="manage">Staff</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6 space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Today</TableHead>
                      <TableHead className="text-right">This Week</TableHead>
                      <TableHead className="text-right font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.summary.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono">{row.code}</Badge></TableCell>
                        <TableCell className="text-right">{row.today_count}</TableCell>
                        <TableCell className="text-right">{row.week_count}</TableCell>
                        <TableCell className="text-right font-bold text-primary">{row.total_count}</TableCell>
                      </TableRow>
                    ))}
                    {(!stats?.summary || stats.summary.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                          No referral data available yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="mt-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Daily Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.daily.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{new Date(row.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono">{row.code}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{row.count}</TableCell>
                      </TableRow>
                    ))}
                    {(!stats?.daily || stats.daily.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          No daily data available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Weekly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Week Starting</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-right">Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.weekly.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{new Date(row.week).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell><Badge variant="outline" className="font-mono">{row.code}</Badge></TableCell>
                        <TableCell className="text-right font-semibold">{row.count}</TableCell>
                      </TableRow>
                    ))}
                    {(!stats?.weekly || stats.weekly.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          No weekly data available.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="mt-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Active Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Added On</TableHead>
                      <TableHead className="text-right">Lifetime Hits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrers.map((referrer) => (
                      <TableRow key={referrer.id}>
                        <TableCell className="text-muted-foreground font-mono text-xs">#{referrer.id}</TableCell>
                        <TableCell className="font-medium">{referrer.name}</TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono">{referrer.code}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{new Date(referrer.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right font-semibold">{referrer.total_downloads}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
