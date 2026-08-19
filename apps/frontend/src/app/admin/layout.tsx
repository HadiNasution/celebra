"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { logoutAction } from "../(auth)/actions";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/publish-monitoring", label: "Publish Monitor" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-white/10 bg-white/5 p-4">
        <Link href="/admin" className="font-display text-xl font-medium text-primary">
          Celebra Admin
        </Link>
        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname === item.href
                  ? "bg-primary/20 text-primary"
                  : "text-text-secondary hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <button
            onClick={async () => {
              await logoutAction();
              router.push("/login");
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-text-secondary hover:bg-white/5 hover:text-white"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
