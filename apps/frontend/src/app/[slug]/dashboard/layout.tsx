"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutDashboard, Mail, Settings } from "lucide-react";
import { Sidebar, type NavGroup } from "@/components/dash/sidebar";

type Tenant = { id: string; slug: string; name: string };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<{ id: string; title: string }[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    let cancelled = false;

    fetch(`${apiUrl}/auth/me`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error("unauthorized");
        return r.json();
      })
      .then(async (me) => {
        // super_admin dikelola via /admin; hindari menulis konten ke tenant salah
        if (me.user.role === "super_admin") {
          router.replace("/admin");
          return;
        }
        const tRes = await fetch(`${apiUrl}/tenants/${slug}`, { credentials: "include" });
        const t = tRes.ok ? await tRes.json() : null;
        if (!t || !("id" in t) || me.user.tenantId !== t.id) {
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

  useEffect(() => {
    if (!tenant) return;
    fetch(`${apiUrl}/invitations`, { credentials: "include" })
      .then((r) => r.json())
      .then((rows: { id: string; title: string }[]) => setInvitations(rows))
      .catch(() => {});
  }, [apiUrl, tenant]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dash-background">
        <p className="animate-pulse text-sm text-dash-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!tenant) return null;

  const navGroups: NavGroup[] = [
    { label: "Dashboard", icon: LayoutDashboard, href: `/${slug}/dashboard/invitations` },
    {
      label: "Invitations",
      icon: Mail,
      children: [
        { label: "All Invitations", href: `/${slug}/dashboard/invitations` },
        { label: "New Invitation", href: `/${slug}/dashboard/invitations/new` },
      ],
    },
    {
      label: "Account",
      icon: Settings,
      children: [{ label: "Settings", href: `/${slug}/dashboard/settings` }],
    },
  ];

  return (
    <div className="flex min-h-screen bg-dash-background text-dash-foreground">
      <Sidebar
        brand={tenant.name}
        groups={navGroups}
        extra={
          <div>
            <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-dash-muted-foreground">
              Guests
            </p>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) router.push(`/${slug}/dashboard/invitations/${e.target.value}/guests`);
              }}
              className="w-full rounded-md border border-dash-input bg-dash-card px-3 py-2 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring"
            >
              <option value="">Select invitation…</option>
              {invitations.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.title}
                </option>
              ))}
            </select>
          </div>
        }
      />
      <main className="flex-1 overflow-x-hidden p-6 lg:p-8">{children}</main>
    </div>
  );
}