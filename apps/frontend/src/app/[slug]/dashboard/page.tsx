"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Eye, MessageSquare, Users, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Invitation = {
  id: string;
  slug: string;
  title: string;
  status: string;
};

type Stats = {
  visitCount: number;
  guestCount: number;
  guestbookCount: number;
  rsvpCount: number;
  status: string;
  publishedAt: string | null;
  subscriptionStatus: string | null;
  subscriptionExpiredAt: string | null;
};

function formatPlan(plan: string): string {
  return plan
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function remainingTime(expiredAt: string | null): string {
  if (!expiredAt) return "—";
  const diff = new Date(expiredAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? "s" : ""}`;
  }
  return `${days} day${days !== 1 ? "s" : ""}`;
}

export default function DashboardHome() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

  useEffect(() => {
    fetch(`${apiUrl}/invitations`, { credentials: "include" })
      .then((r) => r.json())
      .then((rows: Invitation[]) => {
        setInvitations(rows);
        if (rows.length > 0 && !selectedId) {
          setSelectedId(rows[0].id);
        }
      })
      .catch(() => {});
  }, [apiUrl]);

  const loadStats = useCallback(() => {
    if (!selectedId) return;
    fetch(`${apiUrl}/invitations/${selectedId}/stats`, { credentials: "include" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, [apiUrl, selectedId]);

  useEffect(loadStats, [loadStats]);

  const selected = invitations.find((i) => i.id === selectedId);

  return (
    <section className="dash-home">
      <h1 className="dash-home__heading text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="dash-home__selector mt-6">
        <label className="text-sm font-medium text-dash-muted-foreground">Select Invitation</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="mt-1 flex h-9 w-full max-w-md rounded-md border border-dash-input bg-dash-card px-3 py-1 text-sm shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring"
        >
          {invitations.length === 0 && <option value="">No invitations</option>}
          {invitations.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.title}
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="dash-home__meta mt-2 text-sm text-dash-muted-foreground">
          Slug: /{selected.slug} · Status:{" "}
          <Badge variant={selected.status === "published" ? "success" : "warning"}>
            {selected.status}
          </Badge>
        </div>
      )}

      {stats && (
        <div className="dash-home__stats mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Eye, label: "Visits", value: stats.visitCount },
            { icon: MessageSquare, label: "Comments", value: stats.guestbookCount },
            { icon: Users, label: "Guests", value: stats.guestCount },
            { icon: Clock, label: "Remaining", value: remainingTime(stats.subscriptionExpiredAt) },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="dash-home__stat-card hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-dash-muted text-dash-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-dash-muted-foreground">{label}</p>
                  <p className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {stats && (
        <Card className="dash-home__subscription mt-6">
          <CardContent className="p-6 space-y-2 text-sm">
            <p className="flex items-center gap-2">
              Subscription Status:{" "}
              <Badge variant={stats.subscriptionStatus === "active" ? "success" : "destructive"}>
                {stats.subscriptionStatus ?? "—"}
              </Badge>
            </p>
            <p>RSVPs: {stats.rsvpCount}</p>
            {stats.publishedAt && (
              <p>Published: {new Date(stats.publishedAt).toLocaleDateString()}</p>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
