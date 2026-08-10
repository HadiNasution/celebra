"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { logoutAction } from "../../(auth)/actions";

type Tenant = { id: string; slug: string; name: string };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    let cancelled = false;

    fetch(`${apiUrl}/auth/me`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then(async (me) => {
        const t = await fetch(`${apiUrl}/tenants/${slug}`, { credentials: "include" }).then(
          (r) => r.json() as Promise<Tenant | { error?: string }>,
        );
        if (!t || !("id" in t)) throw new Error("tenant not found");

        if (me.user.role !== "super_admin" && me.user.tenantId !== t.id) {
          if (me.user.tenantSlug) router.replace(`/${me.user.tenantSlug}/dashboard`);
          else router.replace("/login");
          return;
        }
        if (!cancelled) setTenant(t);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [router, slug, apiUrl]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  if (!tenant) return null;

  const navItems = [
    { href: `/${slug}/dashboard/invitations`, label: "Invitations" },
    { href: `/${slug}/dashboard/invitations/new`, label: "New Invitation" },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-white/10 bg-white/5 p-4">
        <Link href={`/${slug}/dashboard`} className="font-display text-xl font-medium text-primary">
          {tenant.name}
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
