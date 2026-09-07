"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type SubRow = {
  subscriptions: {
    id: string;
    plan: string;
    status: string;
    expiredAt: string | null;
  };
  tenants: {
    name: string;
  };
};

function formatPlan(plan: string): string {
  return plan
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<SubRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<string>("tenant");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/subscriptions`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let rows = data.filter((row) => {
      const matchesSearch =
        row.tenants.name.toLowerCase().includes(q) ||
        row.subscriptions.plan.toLowerCase().includes(q) ||
        row.subscriptions.status.toLowerCase().includes(q);
      const matchesFilter = statusFilter === "all" || row.subscriptions.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "tenant": cmp = a.tenants.name.localeCompare(b.tenants.name); break;
        case "plan": cmp = a.subscriptions.plan.localeCompare(b.subscriptions.plan); break;
        case "status": cmp = a.subscriptions.status.localeCompare(b.subscriptions.status); break;
        case "expiredAt":
          cmp = (a.subscriptions.expiredAt ?? "").localeCompare(b.subscriptions.expiredAt ?? "");
          break;
        default: cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, search, statusFilter, sortKey, sortDir]);

  async function runAction(id: string, action: "activate" | "cancel") {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    await fetch(`${apiUrl}/admin/subscriptions/${id}/${action}`, {
      method: "POST",
      credentials: "include",
    });
    location.reload();
  }

  return (
    <section className="admin-subscriptions">
      <h1 className="admin-subscriptions__heading text-2xl font-bold tracking-tight">Subscriptions</h1>

      <div className="admin-subscriptions__controls mt-6 flex flex-wrap items-center gap-3">
        <div className="admin-subscriptions__search relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dash-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tenant or plan..."
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="admin-subscriptions__filter rounded-md border border-dash-input bg-dash-card px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <Card className="admin-subscriptions__table mt-6 overflow-x-auto">
          <table className="admin-subscriptions__table-content w-full min-w-[650px] text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              {([
                ["tenant", "Tenant"],
                ["plan", "Plan"],
                ["status", "Status"],
                ["expiredAt", "Expires"],
              ] as [string, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="admin-subscriptions__th px-6 py-3 font-medium cursor-pointer select-none hover:text-dash-foreground transition-colors"
                >
                  {label}
                  {sortKey === key && (
                    <span className="ml-1 text-dash-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                  )}
                </th>
              ))}
              <th className="admin-subscriptions__th px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.subscriptions.id} className="admin-subscriptions__row border-b border-dash-border last:border-0">
                <td className="px-6 py-3">{row.tenants.name}</td>
                <td className="px-6 py-3">{formatPlan(row.subscriptions.plan)}</td>
                <td className="px-6 py-3">
                  <Badge variant={row.subscriptions.status === "active" ? "success" : "destructive"}>
                    {row.subscriptions.status}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-dash-muted-foreground">
                  {row.subscriptions.expiredAt
                    ? new Date(row.subscriptions.expiredAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    {row.subscriptions.status !== "active" && (
                      <Button variant="default" size="sm" onClick={() => runAction(row.subscriptions.id, "activate")}>
                        Activate
                      </Button>
                    )}
                    {row.subscriptions.status === "active" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => runAction(row.subscriptions.id, "cancel")}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-subscriptions__empty px-6 py-8 text-center text-dash-muted-foreground">
                  No subscriptions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
