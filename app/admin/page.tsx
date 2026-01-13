"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface User {
  id: number;
  email: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);

  // Get user info after auth is verified by layout
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
  }, []);

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
          <CardDescription>Welcome to the administration panel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Button asChild className="h-32">
              <Link href="/admin/users">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">User Management</h3>
                  <p className="text-sm opacity-80 mt-2">Add, view, and manage platform users</p>
                </div>
              </Link>
            </Button>

            <Button asChild className="h-32">
              <Link href="/admin/profile">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Profile Settings</h3>
                  <p className="text-sm opacity-80 mt-2">Change your password and account settings</p>
                </div>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-32">
              <Link href="/">
                <div className="text-left">
                  <h3 className="text-lg font-semibold">Main Dashboard</h3>
                  <p className="text-sm opacity-80 mt-2">Return to the main application</p>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}