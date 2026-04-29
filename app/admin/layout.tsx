"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication on the client side
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
      } catch (error) {
        router.push("/login");
        return;
      }
      setAuthChecked(true);
    };

    checkAuth();
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">Checking authentication...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-muted p-4 border-r">
        <div className="mb-8">
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>

        <nav className="space-y-2">
          <Link href="/admin">
            <Button variant="ghost" className="w-full justify-start">
              Admin Dashboard
            </Button>
          </Link>

          <Link href="/admin/users">
            <Button variant="ghost" className="w-full justify-start">
              User Management
            </Button>
          </Link>

          <Link href="/admin/referrals">
            <Button variant="ghost" className="w-full justify-start">
              Referral System
            </Button>
          </Link>

          <Link href="/admin/profile">
            <Button variant="ghost" className="w-full justify-start">
              Profile Settings
            </Button>
          </Link>

          <Link href="/">
            <Button variant="ghost" className="w-full justify-start">
              Back to Dashboard
            </Button>
          </Link>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {children}
      </div>
    </div>
  );
}