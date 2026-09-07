"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LayoutTemplate,
  Radar,
} from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dash/sidebar";

const navGroups: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Customers", icon: Users, href: "/admin/customers" },
  { label: "Subscriptions", icon: CreditCard, href: "/admin/subscriptions" },
  {
    label: "Catalog",
    icon: LayoutTemplate,
    children: [
      { label: "Templates", href: "/admin/templates" },
      { label: "Categories", href: "/admin/categories" },
    ],
  },
  {
    label: "Operations",
    icon: Radar,
    children: [{ label: "Publish Monitor", href: "/admin/publish-monitoring" }],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/auth/me`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then((me) => {
        if (me.user.role !== "super_admin") {
          router.replace(me.user.tenantSlug ? `/${me.user.tenantSlug}/dashboard` : "/login");
          return;
        }
        setLoading(false);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (loading) {
    return (
      <div className="admin-layout__loading flex min-h-screen items-center justify-center bg-dash-background">
        <p className="animate-pulse text-sm text-dash-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout flex min-h-screen flex-col bg-dash-background text-dash-foreground lg:flex-row">
      <Sidebar brand="Celebra Admin" groups={navGroups} />
      <main className="admin-layout__main flex-1 overflow-x-hidden p-6 lg:p-8">{children}</main>
    </div>
  );
}
