"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type PublishRow = {
  publish_histories: {
    id: string;
    version: number;
    status: string;
    publishedAt: string;
  };
  invitations: {
    title: string;
    slug: string;
  };
  tenants: {
    name: string;
  };
};

export default function AdminPublishMonitorPage() {
  const [data, setData] = useState<PublishRow[]>([]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/publish-monitor`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Publish Monitor</h1>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              <th className="px-6 py-3 font-medium">Tenant</th>
              <th className="px-6 py-3 font-medium">Invitation</th>
              <th className="px-6 py-3 font-medium">Version</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Published At</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.publish_histories.id} className="border-b border-dash-border last:border-0">
                <td className="px-6 py-3">{row.tenants.name}</td>
                <td className="px-6 py-3">{row.invitations.title}</td>
                <td className="px-6 py-3">v{row.publish_histories.version}</td>
                <td className="px-6 py-3">
                  <Badge variant={row.publish_histories.status === "success" ? "success" : "destructive"}>
                    {row.publish_histories.status}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-dash-muted-foreground">
                  {new Date(row.publish_histories.publishedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}