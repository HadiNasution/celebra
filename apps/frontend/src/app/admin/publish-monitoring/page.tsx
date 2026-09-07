"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("publishedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/publish-monitor`, { credentials: "include" })
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
    let rows = data.filter((row) =>
      row.tenants.name.toLowerCase().includes(q) ||
      row.invitations.title.toLowerCase().includes(q) ||
      row.invitations.slug.toLowerCase().includes(q)
    );
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "tenant": cmp = a.tenants.name.localeCompare(b.tenants.name); break;
        case "invitation": cmp = a.invitations.title.localeCompare(b.invitations.title); break;
        case "version": cmp = a.publish_histories.version - b.publish_histories.version; break;
        case "status": cmp = a.publish_histories.status.localeCompare(b.publish_histories.status); break;
        case "publishedAt":
          cmp = new Date(a.publish_histories.publishedAt).getTime() - new Date(b.publish_histories.publishedAt).getTime();
          break;
        default: cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, search, sortKey, sortDir]);

  return (
    <section className="admin-publish-monitor">
      <h1 className="admin-publish-monitor__heading text-2xl font-bold tracking-tight">Publish Monitor</h1>

      <div className="admin-publish-monitor__search relative mt-6 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dash-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by tenant or invitation..."
          className="pl-8"
        />
      </div>

      <Card className="admin-publish-monitor__table mt-6 overflow-x-auto">
          <table className="admin-publish-monitor__table-content w-full min-w-[700px] text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              {([
                ["tenant", "Tenant"],
                ["invitation", "Invitation"],
                ["version", "Version"],
                ["status", "Status"],
                ["publishedAt", "Published At"],
              ] as [string, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="admin-publish-monitor__th px-6 py-3 font-medium cursor-pointer select-none hover:text-dash-foreground transition-colors"
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
            {filtered.map((row) => (
              <tr key={row.publish_histories.id} className="admin-publish-monitor__row border-b border-dash-border last:border-0">
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-publish-monitor__empty px-6 py-8 text-center text-dash-muted-foreground">
                  No publish records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
