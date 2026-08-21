"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

export default function AdminCustomersPage() {
  const [data, setData] = useState<Tenant[]>([]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/customers`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-dash-border text-dash-muted-foreground">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Slug</th>
              <th className="px-6 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-b border-dash-border transition-colors duration-150 last:border-0 hover:bg-dash-muted/50">
                <td className="px-6 py-3">
                  <Link
                    href={`/admin/customers/${t.id}`}
                    className="font-medium text-dash-foreground underline-offset-4 transition-colors duration-200 hover:text-dash-primary hover:underline"
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
          </tbody>
        </table>
      </Card>
    </div>
  );
}