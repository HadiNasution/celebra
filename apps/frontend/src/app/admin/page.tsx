"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Mail, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DashboardData = {
  tenantCount: number;
  invitationCount: number;
  totalRevenue: number;
  recentPayments: Array<{
    id: string;
    userName: string;
    plan: string;
    amount: number;
    status: string;
    paidAt: string;
  }>;
};

function formatPlan(plan: string): string {
  return plan
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const stats = [
  { key: "tenantCount", label: "Total Tenants", icon: Building2 },
  { key: "invitationCount", label: "Total Invitations", icon: Mail },
  { key: "totalRevenue", label: "Total Revenue", icon: Wallet },
] as const;

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [sortKey, setSortKey] = useState<string>("paidAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/dashboard`, { credentials: "include" })
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

  const filteredPayments = useMemo(() => {
    if (!data) return [];
    let rows = data.recentPayments;
    if (statusFilter !== "all") {
      rows = rows.filter((p) => p.status === statusFilter);
    }
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "userName": cmp = a.userName.localeCompare(b.userName); break;
        case "plan": cmp = a.plan.localeCompare(b.plan); break;
        case "amount": cmp = a.amount - b.amount; break;
        case "status": cmp = a.status.localeCompare(b.status); break;
        case "paidAt": cmp = new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime(); break;
        default: cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, statusFilter]);

  if (!data) return <p className="animate-pulse text-sm text-dash-muted-foreground">Loading...</p>;

  return (
    <section className="admin-dashboard">
      <h1 className="admin-dashboard__heading text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="admin-dashboard__stats mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="admin-dashboard__stat-card hover:shadow-md">
            <CardContent className="flex items-center gap-4 p-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-dash-muted text-dash-muted-foreground">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm text-dash-muted-foreground">{label}</p>
                <p className="mt-0.5 text-2xl font-semibold tracking-tight">
                  {key === "totalRevenue" ? `$${data.totalRevenue}` : data[key]}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="admin-dashboard__payments mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="admin-dashboard__payments-heading text-lg font-bold tracking-tight">Recent Payments</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-dashboard__payments-filter rounded-md border border-dash-input bg-dash-card px-3 py-1.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-ring"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <Card className="admin-dashboard__payments-table mt-4 overflow-x-auto">
          <table className="admin-dashboard__payments-table w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border text-dash-muted-foreground">
                {([
                  ["userName", "Customer"],
                  ["plan", "Plan"],
                  ["amount", "Amount"],
                  ["status", "Status"],
                  ["paidAt", "Date"],
                ] as [string, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="admin-dashboard__payments-th px-6 py-3 font-medium cursor-pointer select-none hover:text-dash-foreground transition-colors"
                  >
                    {label}
                    {sortKey === key && (
                      <span className="ml-1 text-dash-primary">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id} className="admin-dashboard__payments-row border-b border-dash-border transition-colors duration-150 last:border-0 hover:bg-dash-muted/50">
                  <td className="px-6 py-3">{p.userName}</td>
                  <td className="px-6 py-3">{formatPlan(p.plan)}</td>
                  <td className="px-6 py-3">${p.amount}</td>
                  <td className="px-6 py-3">
                    <Badge variant={p.status === "paid" ? "success" : p.status === "pending" ? "warning" : "destructive"}>
                      {p.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-dash-muted-foreground">
                    {new Date(p.paidAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={5} className="admin-dashboard__payments-empty px-6 py-8 text-center text-dash-muted-foreground">
                    No payments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </section>
  );
}
