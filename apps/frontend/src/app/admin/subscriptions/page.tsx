"use client";

import { useEffect, useState } from "react";

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

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<SubRow[]>([]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/subscriptions`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-medium">Subscriptions</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-text-secondary">
              <th className="pb-3 pr-4">Tenant</th>
              <th className="pb-3 pr-4">Plan</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4">Expires</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-3 pr-4">{row.tenants.name}</td>
                <td className="py-3 pr-4">{row.subscriptions.plan}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    row.subscriptions.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {row.subscriptions.status}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  {row.subscriptions.expiredAt
                    ? new Date(row.subscriptions.expiredAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="py-3 space-x-2">
                  <button
                    onClick={async () => {
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
                      await fetch(`${apiUrl}/admin/subscriptions/${row.subscriptions.id}/activate`, {
                        method: "POST",
                        credentials: "include",
                      });
                      location.reload();
                    }}
                    className="text-xs text-green-400 hover:underline"
                  >
                    Activate
                  </button>
                  <button
                    onClick={async () => {
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
                      await fetch(`${apiUrl}/admin/subscriptions/${row.subscriptions.id}/cancel`, {
                        method: "POST",
                        credentials: "include",
                      });
                      location.reload();
                    }}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
