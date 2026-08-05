"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      <h1 className="font-display text-2xl font-medium">Customers</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-text-secondary">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Slug</th>
              <th className="pb-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-3 pr-4">
                  <Link href={`/admin/customers/${t.id}`} className="text-primary hover:underline">
                    {t.name}
                  </Link>
                </td>
                <td className="py-3 pr-4">{t.slug}</td>
                <td className="py-3">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
