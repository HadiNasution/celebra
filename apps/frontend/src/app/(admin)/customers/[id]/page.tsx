"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type CustomerDetail = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  subscription: { plan: string; status: string; expiredAt: string } | null;
};

export default function CustomerDetailPage() {
  const params = useParams();
  const [data, setData] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/customers/${params.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData);
  }, [params.id]);

  if (!data) return <p className="text-text-secondary">Loading...</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-medium">{data.name}</h1>
      <p className="mt-1 text-sm text-text-secondary">Slug: {data.slug}</p>

      <div className="mt-8">
        <h2 className="text-lg font-medium">Users</h2>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-text-secondary">
              <th className="pb-2 pr-4">Name</th>
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="py-2 pr-4">{u.name}</td>
                <td className="py-2 pr-4">{u.email}</td>
                <td className="py-2">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.subscription && (
        <div className="mt-8">
          <h2 className="text-lg font-medium">Subscription</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p>Plan: <span className="font-medium">{data.subscription.plan}</span></p>
            <p>Status: <span className="font-medium">{data.subscription.status}</span></p>
            <p>Expires: <span className="font-medium">{new Date(data.subscription.expiredAt).toLocaleDateString()}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
