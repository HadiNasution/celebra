"use client";

import { useEffect, useState } from "react";

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
      <h1 className="font-display text-2xl font-medium">Publish Monitor</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-text-secondary">
              <th className="pb-3 pr-4">Tenant</th>
              <th className="pb-3 pr-4">Invitation</th>
              <th className="pb-3 pr-4">Version</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Published At</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-3 pr-4">{row.tenants.name}</td>
                <td className="py-3 pr-4">{row.invitations.title}</td>
                <td className="py-3 pr-4">v{row.publish_histories.version}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    row.publish_histories.status === "success"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>{row.publish_histories.status}</span>
                </td>
                <td className="py-3">
                  {new Date(row.publish_histories.publishedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
