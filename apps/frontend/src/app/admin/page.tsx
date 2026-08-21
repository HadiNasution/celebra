"use client";

import { useEffect, useState } from "react";
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

const stats = [
  { key: "tenantCount", label: "Total Tenants", icon: Building2 },
  { key: "invitationCount", label: "Total Invitations", icon: Mail },
  { key: "totalRevenue", label: "Total Revenue", icon: Wallet },
] as const;

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/dashboard`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="animate-pulse text-sm text-dash-muted-foreground">Loading...</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="hover:shadow-md">
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

      <div className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight">Recent Payments</h2>
        <Card className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border text-dash-muted-foreground">
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p) => (
                <tr key={p.id} className="border-b border-dash-border transition-colors duration-150 last:border-0 hover:bg-dash-muted/50">
                  <td className="px-6 py-3">{p.userName}</td>
                  <td className="px-6 py-3">{p.plan}</td>
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
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}