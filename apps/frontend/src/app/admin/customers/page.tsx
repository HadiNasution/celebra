"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export default function AdminCustomersPage() {
  const [data, setData] = useState<Tenant[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/customers`, { credentials: "include" })
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
    let rows = data.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q),
    );
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "slug": cmp = a.slug.localeCompare(b.slug); break;
        case "createdAt": cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); break;
        default: cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, search, sortKey, sortDir]);

  return (
    <section className="admin-customers">
      <h1 className="admin-customers__heading text-2xl font-bold tracking-tight">Customers</h1>

      <div className="admin-customers__search relative mt-6 max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-dash-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="pl-8"
        />
      </div>

      <Card className="admin-customers__table mt-6 overflow-x-auto">
          <table className="admin-customers__table w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              {([
                ["name", "Name"],
                ["slug", "Slug"],
                ["createdAt", "Created"],
              ] as [string, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="admin-customers__th px-6 py-3 font-medium cursor-pointer select-none hover:text-dash-foreground transition-colors"
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
            {filtered.map((t) => (
              <tr key={t.id} className="admin-customers__row border-b border-dash-border transition-colors duration-150 last:border-0 hover:bg-dash-muted/50">
                <td className="px-6 py-3">
                  <Link
                    href={`/admin/customers/${t.id}`}
                    className="admin-customers__link font-medium text-dash-foreground underline-offset-4 transition-colors duration-200 hover:text-dash-primary hover:underline"
                  >
                    {t.name}
                  </Link>
                </td>
                <td className="px-6 py-3 text-dash-muted-foreground">{t.slug}</td>
                <td className="px-6 py-3 text-dash-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="admin-customers__empty px-6 py-8 text-center text-dash-muted-foreground">
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
