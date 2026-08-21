"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  async function runAction(id: string, action: "activate" | "cancel") {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    await fetch(`${apiUrl}/admin/subscriptions/${id}/${action}`, {
      method: "POST",
      credentials: "include",
    });
    location.reload();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Subscriptions</h1>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              <th className="px-6 py-3 font-medium">Tenant</th>
              <th className="px-6 py-3 font-medium">Plan</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Expires</th>
              <th className="px-6 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.subscriptions.id} className="border-b border-dash-border last:border-0">
                <td className="px-6 py-3">{row.tenants.name}</td>
                <td className="px-6 py-3">{row.subscriptions.plan}</td>
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
                      <Button variant="outline" size="sm" onClick={() => runAction(row.subscriptions.id, "activate")}>
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
          </tbody>
        </table>
      </Card>
    </div>
  );
}