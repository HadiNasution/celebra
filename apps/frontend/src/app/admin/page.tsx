"use client";

import { useEffect, useState } from "react";

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

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/dashboard`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <p className="text-text-secondary">Loading...</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium">Dashboard</h1>

      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-text-secondary">Total Tenants</p>
          <p className="mt-1 font-display text-3xl font-medium">{data.tenantCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-text-secondary">Total Invitations</p>
          <p className="mt-1 font-display text-3xl font-medium">{data.invitationCount}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm text-text-secondary">Total Revenue</p>
          <p className="mt-1 font-display text-3xl font-medium">${data.totalRevenue}</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-medium">Recent Payments</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-text-secondary">
                <th className="pb-3 pr-4">Customer</th>
                <th className="pb-3 pr-4">Plan</th>
                <th className="pb-3 pr-4">Amount</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p) => (
                <tr key={p.id} className="border-b border-white/5">
                  <td className="py-3 pr-4">{p.userName}</td>
                  <td className="py-3 pr-4">{p.plan}</td>
                  <td className="py-3 pr-4">${p.amount}</td>
                  <td className="py-3">{new Date(p.paidAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
